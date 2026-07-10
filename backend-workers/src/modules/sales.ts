import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

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

const saleSchema = z.object({
  clientTransactionId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
  customerName: z.string().max(255).optional().nullable(),
  customerPhone: z.string().max(30).optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  redeemPoints: z.number().min(0).optional().default(0),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const salesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

salesRoute.use('*', authMiddleware);

salesRoute.get('/', requirePermission('pos.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const search = c.req.query('search');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);

  const pageNum = Math.max(page || 1, 1);
  const limitNum = Math.min(Math.max(limit || 20, 1), 100);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('sales')
      .select('*, customers(name)', { count: 'exact' })
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (search) {
      // In Supabase, joining and filtering on joined table is complex via REST.
      // We will filter only by invoice_number for simplicity, or omit joined search.
      query = query.ilike('invoice_number', `%${search}%`);
    }
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: rows, error, count } = await query;
    if (error) throw error;

    const saleIds = (rows || []).map((r: any) => r.id);
    let methodMap: Record<string, string> = {};

    if (saleIds.length > 0) {
      const { data: payRows, error: payError } = await supabase
        .from('payments')
        .select('sale_id, method')
        .in('sale_id', saleIds);

      if (!payError) {
        for (const p of payRows || []) {
          if (!methodMap[p.sale_id]) methodMap[p.sale_id] = p.method;
        }
      }
    }

    const formattedRows = (rows || []).map((r: any) => ({
      id: r.id,
      invoice_number: r.invoice_number,
      grand_total: r.grand_total,
      status: r.status,
      created_at: r.created_at,
      customer_name: r.customers?.name || null,
      payment_method: methodMap[r.id] || '-'
    }));

    return c.json({
      success: true,
      data: keysToCamel(formattedRows),
      pagination: { page: pageNum, limit: limitNum, total: count || 0 }
    });
  } catch (err: any) {
    console.error("Sales GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil riwayat transaksi" } }, 500);
  }
});

salesRoute.post('/', requirePermission('pos.write'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const dataObj = saleSchema.parse(body);
    const clientTxId = dataObj.clientTransactionId || crypto.randomUUID();

    // 1. Idempotency check
    const { data: existingSale } = await supabase
      .from('sales')
      .select('id')
      .eq('business_id', businessId)
      .eq('client_transaction_id', clientTxId)
      .limit(1)
      .single();

    if (existingSale) {
      return c.json({ success: true, message: "Transaksi sudah ada", data: { id: existingSale.id } }, 200);
    }

    // 2. Get warehouse
    const { data: whRes } = await supabase
      .from('warehouses')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (!whRes) throw new Error("Gudang tidak ditemukan");
    const warehouseId = whRes.id;

    // 3. Totals
    let subtotal = 0;
    let discountTotal = 0;
    for (const item of dataObj.items) {
      subtotal += item.price * item.qty;
      discountTotal += item.discount * item.qty;
    }

    // 4. Validate products ownership
    const productIds = dataObj.items.map(i => i.productId);
    if (productIds.length > 0) {
      const { data: validProducts, error: vpError } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', businessId)
        .in('id', productIds);
      if (vpError || !validProducts || validProducts.length !== productIds.length) {
        throw new Error("Terdapat produk yang tidak valid atau bukan milik bisnis ini");
      }
    }

    // 5. Loyalty points
    let appliedRedeemPoints = 0;
    let earnedPoints = 0;
    let customerRecord: any = null;

    if (dataObj.customerId) {
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', dataObj.customerId)
        .eq('business_id', businessId)
        .single();
        
      if (!custData) throw new Error("Pelanggan tidak ditemukan");
      customerRecord = custData;

      if (dataObj.redeemPoints && dataObj.redeemPoints > 0) {
        if (customerRecord.loyalty_points < dataObj.redeemPoints) {
          throw new Error("Poin pelanggan tidak mencukupi untuk di-redeem.");
        }
        appliedRedeemPoints = dataObj.redeemPoints;
        const pointDiscount = appliedRedeemPoints * 100;
        discountTotal += pointDiscount;
      }
    }

    const grandTotal = subtotal - discountTotal;
    if (dataObj.customerId) {
      earnedPoints = Math.floor(grandTotal / 10000);
    }

    const invoiceNumber = `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(Math.random() * 10000)}`;

    // 5. Insert Sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        business_id: businessId,
        warehouse_id: warehouseId,
        customer_id: dataObj.customerId || null,
        client_transaction_id: clientTxId,
        invoice_number: invoiceNumber,
        subtotal: subtotal.toString(),
        discount_total: discountTotal.toString(),
        grand_total: grandTotal.toString(),
        created_by: userId,
        status: 'draft' // Temporary status
      })
      .select()
      .single();

    if (saleError || !saleData) throw saleError || new Error("Failed to insert sale");

    // 6. Insert Items & Update Stock
    if (dataObj.items.length > 0) {
      const itemsToInsert = dataObj.items.map((item) => ({
        sale_id: saleData.id,
        product_id: item.productId,
        qty: item.qty,
        price: item.price.toString(),
        discount: item.discount.toString(),
      }));

      await supabase.from('sale_items').insert(itemsToInsert);
      
      for (const item of dataObj.items) {
        // Fetch current stock
        const { data: stockData } = await supabase
          .from('product_stock')
          .select('quantity')
          .eq('product_id', item.productId)
          .eq('warehouse_id', warehouseId)
          .single();
          
        if (stockData) {
          await supabase
            .from('product_stock')
            .update({ 
              quantity: stockData.quantity - item.qty,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', item.productId)
            .eq('warehouse_id', warehouseId);
        }
      }
    }

    // 7. Insert Payments
    let totalPaid = 0;
    for (const pay of dataObj.payments) {
      totalPaid += pay.amount;
    }
    if (dataObj.payments.length > 0) {
      const paymentsToInsert = dataObj.payments.map((pay) => ({
        sale_id: saleData.id,
        method: pay.method,
        amount: pay.amount.toString(),
      }));
      await supabase.from('payments').insert(paymentsToInsert);
    }

    // 8. Update status & Piutang
    const status = totalPaid >= grandTotal ? "paid" : "partial";
    await supabase.from('sales').update({ status }).eq('id', saleData.id);
    saleData.status = status;

    if (status !== "paid") {
      const remainingAmount = grandTotal - totalPaid;
      await supabase.from('debts').insert({
        business_id: businessId,
        type: 'piutang',
        entity_name: dataObj.customerName || 'Pelanggan Umum',
        entity_phone: dataObj.customerPhone || null,
        amount: remainingAmount.toString(),
        remaining_amount: remainingAmount.toString(),
        status: 'unpaid',
        notes: `Piutang transaksi ${invoiceNumber}`,
        created_by: userId
      });
    }

    // 9. Update Loyalty Points
    if (dataObj.customerId && customerRecord) {
      const newPoints = customerRecord.loyalty_points - appliedRedeemPoints + earnedPoints;
      await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', dataObj.customerId);
    }

    return c.json({ success: true, data: keysToCamel(saleData) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal memproses transaksi");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

salesRoute.get('/:id/document', requirePermission('pos.read'), async (c) => {
  return c.json({ success: false, error: { message: "Fitur PDF dipindahkan atau belum diimplementasi di Workers" } }, 501);
});

salesRoute.post('/qris-token', async (c) => {
  return c.json({ success: true, data: { token: 'mock-qris-token-workers' } });
});

salesRoute.post('/:id/send-wa', async (c) => {
  return c.json({ success: true, message: "Pesan WA disimulasikan sukses" });
});

salesRoute.post('/:id/send-email', async (c) => {
  return c.json({ success: true, message: "Email disimulasikan sukses" });
});
