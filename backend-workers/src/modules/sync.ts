import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

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
  )
});

type Variables = { businessId: string; userId: string; roleId: string };
export const syncRoute = new Hono<{ Bindings: any, Variables: Variables }>();

syncRoute.use('*', authMiddleware);

syncRoute.get('/pull', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const since = c.req.query('since');

  try {
    let pQuery = supabase.from('products').select('id, business_id, category_id, sku, barcode, name, description, unit, sell_price, min_stock, image_url, is_active, updated_at, product_stock(quantity)').eq('business_id', businessId);
    let cQuery = supabase.from('categories').select('*').eq('business_id', businessId);
    let custQuery = supabase.from('customers').select('*, sales(grand_total, status)').eq('business_id', businessId);

    if (since) {
      const sinceDate = new Date(since).toISOString();
      pQuery = pQuery.gte('updated_at', sinceDate);
      cQuery = cQuery.gte('created_at', sinceDate);
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
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menarik sinkronisasi" } }, 400);
  }
});

syncRoute.post('/push', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const data = syncPushSchema.parse(body);

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

    for (const t of data.transactions) {
      const { data: existingSale } = await supabase.from('sales').select('id').eq('business_id', businessId).eq('client_transaction_id', t.client_transaction_id).single();
      if (existingSale) continue; // Skip existing

      let subtotal = 0;
      let discountTotal = 0;
      for (const item of t.items) {
        subtotal += item.price * item.qty;
        discountTotal += item.discount * item.qty;
      }
      const grandTotal = subtotal - discountTotal;
      const invoiceNumber = `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(Math.random() * 10000)}`;

      const { data: sale, error: saleErr } = await supabase.from('sales').insert({
        business_id: businessId,
        warehouse_id: warehouseId,
        client_transaction_id: t.client_transaction_id,
        invoice_number: invoiceNumber,
        subtotal: subtotal.toString(),
        discount_total: discountTotal.toString(),
        grand_total: grandTotal.toString(),
        created_by: userId,
      }).select().single();

      if (saleErr) throw saleErr;

      if (t.items.length > 0) {
        const saleItemsToInsert = t.items.map(item => ({
          sale_id: sale.id,
          product_id: item.productId,
          qty: item.qty,
          price: item.price.toString(),
          discount: item.discount.toString(),
        }));
        await supabase.from('sale_items').insert(saleItemsToInsert);
      }

      for (const item of t.items) {
        // Safe stock update via RPC is recommended, but doing read-modify-write if RPC doesn't exist
        // For sync push, we can just call our decrease_stock function if available, but let's do a simple update for now
        const { data: stockData } = await supabase.from('product_stock').select('quantity').eq('product_id', item.productId).eq('warehouse_id', warehouseId).single();
        if (stockData) {
          const newQty = stockData.quantity - item.qty;
          await supabase.from('product_stock').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('product_id', item.productId).eq('warehouse_id', warehouseId);
        }
      }

      let totalPaid = 0;
      for (const pay of t.payments) {
        totalPaid += pay.amount;
      }

      if (t.payments.length > 0) {
        const paymentsToInsert = t.payments.map(pay => ({
          sale_id: sale.id,
          method: pay.method,
          amount: pay.amount.toString(),
        }));
        await supabase.from('payments').insert(paymentsToInsert);
      }

      const status = totalPaid >= grandTotal ? "paid" : "partial";
      if (status !== "paid") {
        await supabase.from('sales').update({ status }).eq('id', sale.id);

        const remainingAmount = grandTotal - totalPaid;
        await supabase.from('debts').insert({
          business_id: businessId,
          type: 'piutang',
          entity_name: t.customerName || 'Pelanggan Umum',
          entity_phone: t.customerPhone,
          amount: remainingAmount.toString(),
          remaining_amount: remainingAmount.toString(),
          status: 'unpaid',
          notes: `Piutang sinkronisasi ${invoiceNumber}`,
          created_by: userId
        });
      }

      processed++;
    }

    return c.json({ success: true, message: `Berhasil push ${processed} transaksi` });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal mendorong sinkronisasi");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
