import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    // 1. Fetch sale data
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .select('*, customers(name, phone)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (saleErr || !sale) return c.json({ success: false, error: { message: "Transaksi tidak ditemukan" } }, 404);

    // 2. Fetch sale items
    const { data: items } = await supabase
      .from('sale_items')
      .select('*, products(name)')
      .eq('sale_id', id);

    // 3. Fetch business info
    const { data: biz } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    const businessName = biz?.name || "Toko Anda";

    // 4. Generate PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    let y = height - 50;
    const margin = 50;

    // Header
    page.drawText(businessName, { x: margin, y, size: 20, font: boldFont });
    y -= 25;
    page.drawText('INVOICE', { x: margin, y, size: 16, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText(`No: ${sale.invoice_number}`, { x: margin, y, size: 10, font });
    page.drawText(`Tanggal: ${new Date(sale.created_at).toLocaleDateString('id-ID')}`, { x: width - margin - 150, y, size: 10, font });
    y -= 15;
    const custName = sale.customers?.name || 'Pelanggan Umum';
    page.drawText(`Pelanggan: ${custName}`, { x: margin, y, size: 10, font });

    y -= 40;

    // Table Header
    page.drawText('Barang', { x: margin, y, size: 10, font: boldFont });
    page.drawText('Qty', { x: margin + 200, y, size: 10, font: boldFont });
    page.drawText('Harga', { x: margin + 270, y, size: 10, font: boldFont });
    page.drawText('Diskon', { x: margin + 350, y, size: 10, font: boldFont });
    page.drawText('Total', { x: width - margin - 70, y, size: 10, font: boldFont });
    y -= 15;

    // Table Line
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 15;

    // Items
    for (const item of items || []) {
       const pName = item.products?.name || 'Item tidak diketahui';
       const qty = item.qty;
       const price = Number(item.price);
       const discount = Number(item.discount || 0);
       const total = (price - discount) * qty;

       page.drawText(pName.substring(0, 30), { x: margin, y, size: 10, font });
       page.drawText(qty.toString(), { x: margin + 200, y, size: 10, font });
       page.drawText(`Rp ${price.toLocaleString('id-ID')}`, { x: margin + 270, y, size: 10, font });
       page.drawText(`Rp ${discount.toLocaleString('id-ID')}`, { x: margin + 350, y, size: 10, font });
       page.drawText(`Rp ${total.toLocaleString('id-ID')}`, { x: width - margin - 70, y, size: 10, font });
       y -= 15;
    }

    y -= 10;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    // Totals
    page.drawText('Subtotal:', { x: width - margin - 200, y, size: 10, font });
    page.drawText(`Rp ${Number(sale.subtotal).toLocaleString('id-ID')}`, { x: width - margin - 70, y, size: 10, font });
    y -= 15;
    page.drawText('Diskon:', { x: width - margin - 200, y, size: 10, font });
    page.drawText(`Rp ${Number(sale.discount_total).toLocaleString('id-ID')}`, { x: width - margin - 70, y, size: 10, font });
    y -= 15;
    page.drawText('Grand Total:', { x: width - margin - 200, y, size: 12, font: boldFont });
    page.drawText(`Rp ${Number(sale.grand_total).toLocaleString('id-ID')}`, { x: width - margin - 70, y, size: 12, font: boldFont });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice-${sale.invoice_number.replace(/\//g, '-')}.pdf"`
      }
    });

  } catch (err: any) {
    console.error("PDF Generate Error:", err);
    return c.json({ success: false, error: { message: "Gagal membuat dokumen PDF" } }, 500);
  }
});

salesRoute.post('/qris-token', async (c) => {
  return c.json({ success: true, data: { token: 'mock-qris-token-workers' } });
});

salesRoute.post('/:id/send-wa', requirePermission('pos.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');
  const waApiKey = c.env.WA_API_KEY;

  if (!waApiKey) {
    return c.json({ success: false, error: { message: "WA_API_KEY belum dikonfigurasi di environment" } }, 400);
  }

  try {
    const { data: sale, error } = await supabase
      .from('sales')
      .select('invoice_number, grand_total, customers(name, phone)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !sale) return c.json({ success: false, error: { message: "Transaksi tidak ditemukan" } }, 404);
    
    const customer: any = sale.customers;
    if (!customer?.phone) return c.json({ success: false, error: { message: "Pelanggan tidak memiliki nomor telepon" } }, 400);

    const phone = customer.phone;
    const name = customer.name || 'Pelanggan Umum';
    const total = Number(sale.grand_total).toLocaleString('id-ID');
    const message = `Halo ${name}, terima kasih telah berbelanja. Total tagihan Anda adalah Rp ${total} dengan No Invoice: ${sale.invoice_number}.`;

    // WARNING: Menggunakan Fonnte (API web scraping tidak resmi) dengan nomor WA utama berisiko terkena ban dari Meta.
    // Direkomendasikan menggunakan nomor cadangan (dummy) atau beralih ke WhatsApp Cloud API resmi untuk produksi jangka panjang.
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': waApiKey
      },
      body: new URLSearchParams({
        target: phone,
        message: message
      })
    });

    const result: any = await response.json();
    if (!response.ok || !result.status) {
      console.error("Fonnte API Error:", result);
      return c.json({ success: false, error: { message: "Gagal mengirim WhatsApp via API Fonnte" } }, 500);
    }

    return c.json({ success: true, message: "Pesan WA berhasil dikirim" });
  } catch (err) {
    console.error("Send WA Error:", err);
    return c.json({ success: false, error: { message: "Terjadi kesalahan internal" } }, 500);
  }
});

salesRoute.post('/:id/send-email', requirePermission('pos.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');
  const emailApiKey = c.env.EMAIL_API_KEY;

  if (!emailApiKey) {
    return c.json({ success: false, error: { message: "EMAIL_API_KEY belum dikonfigurasi di environment" } }, 400);
  }

  try {
    const { data: sale, error } = await supabase
      .from('sales')
      .select('invoice_number, grand_total, customers(name, email)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !sale) return c.json({ success: false, error: { message: "Transaksi tidak ditemukan" } }, 404);
    
    const customer: any = sale.customers;
    if (!customer?.email) return c.json({ success: false, error: { message: "Pelanggan tidak memiliki email valid" } }, 400);

    const email = customer.email;
    const name = customer.name || 'Pelanggan Umum';
    const total = Number(sale.grand_total).toLocaleString('id-ID');
    const message = `Halo ${name}, terima kasih telah berbelanja. Total tagihan Anda adalah Rp ${total} dengan No Invoice: ${sale.invoice_number}.`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Invoice <onboarding@resend.dev>', // You should verify your own domain on Resend
        to: email,
        subject: `Invoice Pembelian - ${sale.invoice_number}`,
        html: `<div style="font-family: sans-serif; padding: 20px;">
          <h2>Terima Kasih, ${name}!</h2>
          <p>Total transaksi Anda adalah <strong>Rp ${total}</strong>.</p>
          <p>Nomor Invoice: ${sale.invoice_number}</p>
        </div>`
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Resend API Error:", result);
      return c.json({ success: false, error: { message: "Gagal mengirim Email via API Resend" } }, 500);
    }

    return c.json({ success: true, message: "Email berhasil dikirim" });
  } catch (err) {
    console.error("Send Email Error:", err);
    return c.json({ success: false, error: { message: "Terjadi kesalahan internal" } }, 500);
  }
});
