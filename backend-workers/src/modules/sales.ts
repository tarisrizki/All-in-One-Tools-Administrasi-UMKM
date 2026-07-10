import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

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

type Variables = { businessId: string; userId: string };
export const salesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

salesRoute.use('*', mockAuth);

salesRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const search = c.req.query('search');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const page = parseInt(c.req.query('page') || '1', 10) || 1;
  const limit = parseInt(c.req.query('limit') || '20', 10) || 20;
  
  const offset = (Math.max(page, 1) - 1) * Math.min(Math.max(limit, 1), 100);

  try {
    let query = supabase
      .from('sales')
      .select('id, invoice_number, grand_total, status, created_at, customers(name), payments(method)', { count: 'exact' })
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,customers.name.ilike.%${search}%`);
    }
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;
    if (error) throw error;

    const result = (data || []).map((s: any) => {
      const { customers, payments, ...rest } = s;
      return {
        ...rest,
        customer_name: customers?.name || null,
        payment_method: (payments && payments.length > 0) ? payments[0].method : '-'
      };
    });

    return c.json({
      success: true,
      data: keysToCamel(result),
      pagination: { page, limit, total: count || 0 }
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengambil riwayat transaksi" } }, 500);
  }
});

salesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const dataObj = saleSchema.parse(body);
    const clientTxId = dataObj.clientTransactionId || crypto.randomUUID();

    // Idempotency check
    const { data: existingData } = await supabase
      .from('sales')
      .select('id')
      .eq('business_id', businessId)
      .eq('client_transaction_id', clientTxId)
      .limit(1);

    if (existingData && existingData.length > 0) {
      return c.json({ success: true, message: "Transaksi sudah ada", data: { id: existingData[0].id } });
    }

    // Get warehouse
    const { data: whData } = await supabase
      .from('warehouses')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_default', true)
      .limit(1);

    if (!whData || whData.length === 0) throw new Error("Gudang tidak ditemukan");
    const warehouseId = whData[0].id;

    let subtotal = 0;
    let discountTotal = 0;
    for (const item of dataObj.items) {
      subtotal += item.price * item.qty;
      discountTotal += item.discount * item.qty;
    }

    let appliedRedeemPoints = 0;
    let earnedPoints = 0;
    
    if (dataObj.customerId) {
      const { data: custData } = await supabase.from('customers').select('*').eq('id', dataObj.customerId).single();
      if (!custData) throw new Error("Pelanggan tidak ditemukan");
      
      if (dataObj.redeemPoints && dataObj.redeemPoints > 0) {
        if (custData.loyalty_points < dataObj.redeemPoints) throw new Error("Poin pelanggan tidak mencukupi untuk di-redeem.");
        appliedRedeemPoints = dataObj.redeemPoints;
        discountTotal += appliedRedeemPoints * 100;
      }
    }

    const grandTotal = subtotal - discountTotal;
    if (dataObj.customerId) {
      earnedPoints = Math.floor(grandTotal / 10000);
    }

    const invoiceNumber = `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(Math.random() * 10000)}`;

    // Insert Sale
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
      }).select();

    if (saleError) throw saleError;
    const sale = saleData[0];

    try {
      // Insert Items
      if (dataObj.items.length > 0) {
        const { error: itemsError } = await supabase.from('sale_items').insert(
          dataObj.items.map((item) => ({
            sale_id: sale.id,
            product_id: item.productId,
            qty: item.qty,
            price: item.price.toString(),
            discount: item.discount.toString(),
          }))
        );
        if (itemsError) throw itemsError;
      }

      // Update Stock (sequential since Supabase JS doesn't do mass updates easily)
      for (const item of dataObj.items) {
        // Since we can't do sql`quantity - qty` in REST natively without RPC, 
        // we have to read, then write. This is a compromise for not using RPC.
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

      // Insert Payments
      let totalPaid = 0;
      for (const pay of dataObj.payments) { totalPaid += pay.amount; }
      
      if (dataObj.payments.length > 0) {
        const { error: payError } = await supabase.from('payments').insert(
          dataObj.payments.map((pay) => ({
            sale_id: sale.id,
            method: pay.method,
            amount: pay.amount.toString(),
          }))
        );
        if (payError) throw payError;
      }

      const status = totalPaid >= grandTotal ? "paid" : "partial";
      if (status !== "paid") {
        await supabase.from('sales').update({ status }).eq('id', sale.id);
        sale.status = status;
        
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

      // Update Loyalty
      if (dataObj.customerId) {
        const { data: custData } = await supabase.from('customers').select('loyalty_points').eq('id', dataObj.customerId).single();
        if (custData) {
          await supabase.from('customers')
            .update({ loyalty_points: custData.loyalty_points - appliedRedeemPoints + earnedPoints })
            .eq('id', dataObj.customerId);
        }
      }

    } catch (innerError) {
      // rollback if items/payments fail
      await supabase.from('sales').delete().eq('id', sale.id);
      throw innerError;
    }

    return c.json({ success: true, data: keysToCamel(sale) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

salesRoute.get('/:id/document', async (c) => {
  return c.json({ success: false, error: { message: "Generate PDF belum diimplementasikan di versi Cloudflare Workers" } }, 501);
});

salesRoute.post('/qris-token', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const body = await c.req.json();
    const { order_id, gross_amount, customer_details } = body;
    
    if (!order_id || !gross_amount) {
       return c.json({ success: false, error: { message: "order_id dan gross_amount diperlukan" } }, 400);
    }
    
    const serverKey = c.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
       // Mock Mode
       return c.json({ 
         success: true, 
         data: { token: "mock-qris-token-" + crypto.randomUUID(), redirect_url: "https://mock.midtrans.com/snap" } 
       });
    }

    const authString = btoa(`${serverKey}:`);
    const res = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        transaction_details: { order_id, gross_amount },
        customer_details,
        payment_type: "qris"
      })
    });
    
    if (!res.ok) throw new Error("Gagal memanggil API Midtrans");
    const json = await res.json() as any;
    
    return c.json({ success: true, data: { token: json.token, redirect_url: json.redirect_url } });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal membuat transaksi QRIS" } }, 500);
  }
});

salesRoute.post('/:id/send-wa', async (c) => {
  // Simulasi/Mock WA. Integrasi WhatsApp (misal Fonnte/Twilio) via fetch bisa ditambahkan di sini.
  return c.json({ success: true, message: "Pesan WA berhasil dikirim (disimulasikan dari Workers)" });
});

salesRoute.post('/:id/send-email', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const { email } = body;
    
    if (!email) return c.json({ success: false, error: { message: "Email pelanggan diperlukan" } }, 400);

    const { data: saleData } = await supabase.from('sales').select('invoice_number, grand_total').eq('id', id).eq('business_id', businessId).single();
    if (!saleData) throw new Error("Transaksi tidak ditemukan");

    const resendApiKey = c.env.RESEND_API_KEY;
    if (!resendApiKey) {
      // Mock Mode
      return c.json({ success: true, message: `Email struk berhasil dikirim ke ${email} (Mock Mode)` });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'UMKM <onboarding@resend.dev>',
        to: [email],
        subject: `Struk Pembelian Anda - ${saleData.invoice_number}`,
        html: `<strong>Terima kasih atas pembelian Anda!</strong><br><br>Total Belanja: Rp ${saleData.grand_total}`
      })
    });

    if (!res.ok) throw new Error("Gagal memanggil API Resend");

    return c.json({ success: true, message: `Email struk berhasil dikirim ke ${email}` });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengirim email" } }, 500);
  }
});
