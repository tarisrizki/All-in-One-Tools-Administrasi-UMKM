import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().min(1),
  price: z.number().min(0),
  discount: z.number().min(0).default(0),
});

const paymentSchema = z.object({
  method: z.string().max(50),
  amount: z.number().min(0),
});

const syncPushSchema = z.object({
  transactions: z.array(
    z.object({
      client_transaction_id: z.string().uuid(),
      items: z.array(saleItemSchema).min(1),
      payments: z.array(paymentSchema).min(1),
      customerName: z.string().max(255).nullable().optional(),
      customerPhone: z.string().max(30).nullable().optional(),
      notes: z.string().nullable().optional(),
    })
  ).min(1).max(100, "Maksimal 100 transaksi per request")
});

const pullRoute = createRoute({
  tags: ['Sync'],
  method: 'get',
  path: '/pull',
  description: 'Menarik data terbaru dari server (sinkronisasi)',
  request: {
    query: z.object({ since: z.string().optional() }),
  },
  responses: {
    200: {
      content: { 
        'application/json': { 
          schema: createSuccessSchema(z.object({
            products: z.array(z.unknown()),
            categories: z.array(z.unknown()),
            customers: z.array(z.unknown()),
          })) 
        } 
      },
      description: 'Data sync pull',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Gagal menarik data',
    },
  },
});

const pushRoute = createRoute({
  tags: ['Sync'],
  method: 'post',
  path: '/push',
  description: 'Mendorong data transaksi offline ke server',
  request: {
    body: {
      content: { 'application/json': { schema: syncPushSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Berhasil push',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Input tidak valid',
    },
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const syncRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

syncRoute.use('*', authMiddleware);

syncRoute.openapi(pullRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { since } = c.req.valid('query');

  try {
    let pQuery = supabase.from('products').select('id, business_id, category_id, sku, barcode, name, description, unit, sell_price, min_stock, image_url, is_active, updated_at, product_stock(quantity)').eq('business_id', businessId);
    let cQuery = supabase.from('categories').select('*').eq('business_id', businessId);
    let custQuery = supabase.from('customers').select('*, sales(grand_total, status)').eq('business_id', businessId);

    if (since) {
      // Validasi format tanggal — tolak input tidak valid agar sinkronisasi tidak silently gagal
      const parsed = new Date(since);
      if (isNaN(parsed.getTime())) {
        return c.json({ success: false, error: { message: "Parameter 'since' tidak valid (format ISO tanggal)" } }, 400);
      }
      const sinceDate = parsed.toISOString();
      pQuery = pQuery.gte('updated_at', sinceDate);
      cQuery = cQuery.gte('updated_at', sinceDate);
      custQuery = custQuery.gte('updated_at', sinceDate);
    }

    const [productsRes, categoriesRes, customersRes] = await Promise.all([pQuery, cQuery, custQuery]);

    const formattedProducts = (productsRes.data || []).map((p: any) => ({
      id: p.id,
      businessId: p.business_id,
      categoryId: p.category_id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      unit: p.unit,
      price: parseFloat(p.sell_price),
      stock: p.product_stock?.[0]?.quantity || 0,
      minStock: p.min_stock,
      image: p.image_url,
      isActive: p.is_active,
      updatedAt: p.updated_at
    }));

    const formattedCustomers = (customersRes.data || []).map((cust: any) => {
      let totalSpent = 0;
      for (const s of cust.sales || []) {
        if (s.status === 'paid') totalSpent += parseFloat(s.grand_total);
      }
      
      let tier = 'Reguler';
      if (totalSpent >= 5000000) tier = 'Gold';
      else if (totalSpent >= 1000000) tier = 'Silver';

      const { sales, ...custData } = cust;
      return { ...custData, totalSpent, tier };
    });

    return c.json({
      success: true,
      data: keysToCamel({
        products: formattedProducts,
        categories: categoriesRes.data || [],
        customers: formattedCustomers
      })
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menarik sinkronisasi" } }, 400);
  }
});

syncRoute.openapi(pushRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const data = c.req.valid('json');

    const { data: wh } = await supabase.from('warehouses').select('id').eq('business_id', businessId).eq('is_default', true).limit(1).single();
    if (!wh) throw new Error("Gudang tidak ditemukan");
    const warehouseId = wh.id;

    // Validate products ownership
    const allProductIds = new Set<string>();
    data.transactions.forEach(t => t.items.forEach(i => allProductIds.add(i.productId)));
    const productIdsArray = Array.from(allProductIds);
    if (productIdsArray.length > 0) {
      const { data: validProducts, error: vpErr } = await supabase.from('products').select('id').eq('business_id', businessId).in('id', productIdsArray);
      if (vpErr || !validProducts || validProducts.length !== productIdsArray.length) {
        throw new Error("Terdapat produk yang tidak valid atau bukan milik bisnis ini");
      }
    }

    let processed = 0;
    const failed: Array<{ index: number; clientTransactionId: string; error: string }> = [];

    for (let idx = 0; idx < data.transactions.length; idx++) {
      const t = data.transactions[idx];

      // Hitung totals
      let subtotal = 0;
      let discountTotal = 0;
      for (const item of t.items) {
        subtotal += item.price * item.qty;
        discountTotal += item.discount * item.qty;
      }
      const grandTotal = subtotal - discountTotal;

      // Nomor invoice: sequential + UUID suffix (anti-collision)
      const { count: saleCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);
      const invoiceNumber = `INV/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${String((saleCount || 0) + 1).padStart(5, '0')}-${crypto.randomUUID().slice(0, 6)}`;

      // Panggil RPC atomik — idempotent (cek client_transaction_id), stock lock (FOR UPDATE), atomic
      const { data: result, error: rpcErr } = await supabase.rpc('process_sale', {
        p_business_id: businessId,
        p_warehouse_id: warehouseId,
        p_customer_id: null,
        p_client_transaction_id: t.client_transaction_id,
        p_invoice_number: invoiceNumber,
        p_subtotal: subtotal,
        p_discount_total: discountTotal,
        p_grand_total: grandTotal,
        p_created_by: userId,
        p_items: t.items.map((i) => ({
          product_id: i.productId,
          qty: i.qty,
          price: i.price,
          discount: i.discount,
        })),
        p_payments: t.payments.map((p) => ({ method: p.method, amount: p.amount })),
        p_redeem_points: 0,
        p_earned_points: 0,
        p_customer_name: t.customerName || null,
        p_customer_phone: t.customerPhone || null,
      });

      if (rpcErr) {
        // 23505 = unique violation. Bisa berarti client_transaction_id duplikat (idempotent success),
        // atau collision invoice_number (data loss kalau di-skip diam-diam). Verifikasi dulu.
        if (rpcErr.code === '23505' || (rpcErr.message || '').includes('duplicate')) {
          const { data: existing } = await supabase
            .from('sales')
            .select('id')
            .eq('business_id', businessId)
            .eq('client_transaction_id', t.client_transaction_id)
            .maybeSingle();
          if (existing) {
            processed++;
            continue;
          }
          // Bukan duplikat transaksi → kegagalan nyata (kemungkinan collision nomor invoice)
          failed.push({ index: idx, clientTransactionId: t.client_transaction_id, error: rpcErr.message || 'Gagal memproses transaksi' });
          continue;
        }
        failed.push({ index: idx, clientTransactionId: t.client_transaction_id, error: rpcErr.message || 'Gagal memproses transaksi' });
        continue;
      }

      if (result?.duplicate) {
        // Idempotent — transaksi sudah ada sebelumnya
        processed++;
        continue;
      }

      processed++;
    }

    if (failed.length > 0) {
      return c.json({
        success: false,
        error: {
          message: `${failed.length} transaksi gagal dari ${data.transactions.length} total`,
          details: failed,
        }
      }, 400);
    }

    return c.json({ success: true, message: `Berhasil push ${processed} transaksi` }, 200);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal mendorong sinkronisasi");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
