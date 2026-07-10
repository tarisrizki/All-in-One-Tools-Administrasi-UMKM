import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';

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

type Variables = { businessId: string; userId: string };
export const syncRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

syncRoute.use('*', mockAuth);

syncRoute.get('/pull', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const since = c.req.query('since');

  try {
    let pQ = supabase.from('products').select('*, product_stock(quantity)').eq('business_id', businessId);
    let cQ = supabase.from('categories').select('*').eq('business_id', businessId);
    let custQ = supabase.from('customers').select('*, sales!left(grand_total, status)').eq('business_id', businessId);

    if (since) {
      const sinceDate = new Date(since).toISOString();
      pQ = pQ.gte('updated_at', sinceDate);
      cQ = cQ.gte('created_at', sinceDate);
      custQ = custQ.gte('updated_at', sinceDate);
    }

    const [productsRes, categoriesRes, customersRes] = await Promise.all([pQ, cQ, custQ]);

    const formattedProducts = (productsRes.data || []).map((p: any) => {
      const stock = (p.product_stock || []).reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
      const { product_stock, ...rest } = p;
      return {
        ...rest,
        price: parseFloat(p.sell_price),
        stock
      };
    });
    
    const formattedCustomers = (customersRes.data || []).map((c: any) => {
      const { sales, ...rest } = c;
      const totalSpent = (sales || []).filter((s: any) => s.status === 'paid').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
      let tier = 'Reguler';
      if (totalSpent >= 5000000) tier = 'Gold';
      else if (totalSpent >= 1000000) tier = 'Silver';
      return { ...rest, tier, total_spent: totalSpent };
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

    const { data: whRes } = await supabase.from('warehouses').select('id').eq('business_id', businessId).eq('is_default', true).limit(1);
    if (!whRes || whRes.length === 0) throw new Error("Gudang tidak ditemukan");
    const warehouseId = whRes[0].id;

    let processed = 0;
    
    // Process sequentially due to complex dependencies per transaction
    for (const t of data.transactions) {
      const { data: existingSale } = await supabase.from('sales').select('id').eq('business_id', businessId).eq('client_transaction_id', t.client_transaction_id).limit(1);
      if (existingSale && existingSale.length > 0) continue;

      let subtotal = 0;
      let discountTotal = 0;
      for (const item of t.items) {
        subtotal += item.price * item.qty;
        discountTotal += item.discount * item.qty;
      }
      const grandTotal = subtotal - discountTotal;
      const invoiceNumber = `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(Math.random() * 10000)}`;

      const { data: saleRes, error: saleErr } = await supabase.from('sales').insert({
        business_id: businessId,
        warehouse_id: warehouseId,
        client_transaction_id: t.client_transaction_id,
        invoice_number: invoiceNumber,
        subtotal: subtotal.toString(),
        discount_total: discountTotal.toString(),
        grand_total: grandTotal.toString(),
        created_by: userId,
      }).select('id');
      
      if (saleErr) throw saleErr;
      const saleId = saleRes[0].id;

      if (t.items.length > 0) {
        await supabase.from('sale_items').insert(
          t.items.map((item) => ({
            sale_id: saleId,
            product_id: item.productId,
            qty: item.qty,
            price: item.price.toString(),
            discount: item.discount.toString(),
          }))
        );
        
        for (const item of t.items) {
          const { data: st } = await supabase.from('product_stock').select('quantity').eq('product_id', item.productId).eq('warehouse_id', warehouseId).single();
          if (st) {
            await supabase.from('product_stock')
              .update({ quantity: st.quantity - item.qty, updated_at: new Date().toISOString() })
              .eq('product_id', item.productId)
              .eq('warehouse_id', warehouseId);
          }
        }
      }

      let totalPaid = 0;
      for (const pay of t.payments) totalPaid += pay.amount;
      
      if (t.payments.length > 0) {
        await supabase.from('payments').insert(
          t.payments.map((pay) => ({
            sale_id: saleId,
            method: pay.method,
            amount: pay.amount.toString(),
          }))
        );
      }

      const status = totalPaid >= grandTotal ? "paid" : "partial";
      if (status !== "paid") {
        await supabase.from('sales').update({ status }).eq('id', saleId);
        
        const remainingAmount = grandTotal - totalPaid;
        await supabase.from('debts').insert({
          business_id: businessId,
          type: 'piutang',
          entity_name: t.customerName || 'Pelanggan Umum',
          entity_phone: t.customerPhone || null,
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
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
