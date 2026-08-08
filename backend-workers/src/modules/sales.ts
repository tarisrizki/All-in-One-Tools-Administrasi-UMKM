import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

const saleSchema = z.object({
  clientTransactionId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
  customerName: z.string().max(255).optional().nullable(),
  customerPhone: z.string().max(30).optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  redeemPoints: z.number().min(0).optional().default(0),
});

const salesListResponseSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  grandTotal: z.string(),
  status: z.string(),
  createdAt: z.string(),
  customerName: z.string().nullable().optional(),
  paymentMethod: z.string(),
});

const saleCreateResponseSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string().optional(),
  // bisa tambahkan field lain jika perlu, return type dari insert
}).passthrough(); // passthrough karena kita return object supabase

const listRoute = createRoute({
  tags: ['Sales'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar riwayat transaksi penjualan',
  request: {
    query: z.object({
      search: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
  },
  responses: {
    200: {
      content: { 
        'application/json': { 
          schema: z.object({
            success: z.boolean(),
            data: z.array(salesListResponseSchema),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
            })
          }) 
        } 
      },
      description: 'Daftar riwayat penjualan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const createRouteDef = createRoute({
  tags: ['Sales'],
  method: 'post',
  path: '/',
  description: 'Membuat transaksi penjualan baru',
  request: {
    body: {
      content: { 'application/json': { schema: saleSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ id: z.string() }) }) } },
      description: 'Transaksi sudah ada (Idempotency)',
    },
    201: {
      content: { 'application/json': { schema: createSuccessSchema(saleCreateResponseSchema) } },
      description: 'Transaksi berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
  },
});

const documentRoute = createRoute({
  tags: ['Sales'],
  method: 'get',
  path: '/{id}/document',
  description: 'Mendownload struk PDF',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'application/pdf': { schema: z.any() } },
      description: 'PDF Document',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Transaksi tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const qrisTokenRoute = createRoute({
  tags: ['Sales'],
  method: 'post',
  path: '/qris-token',
  description: 'Mendapatkan QRIS token mock',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.object({ token: z.string() })) } },
      description: 'QRIS Token',
    }
  },
});

const sendWaRoute = createRoute({
  tags: ['Sales'],
  method: 'post',
  path: '/{id}/send-wa',
  description: 'Mengirim struk via WhatsApp',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Pesan terkirim',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Transaksi tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const sendEmailRoute = createRoute({
  tags: ['Sales'],
  method: 'post',
  path: '/{id}/send-email',
  description: 'Mengirim struk via Email',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Pesan terkirim',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Transaksi tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const salesRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

salesRoute.use('*', authMiddleware);

salesRoute.get('/', requirePermission('pos.read'));
salesRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { search, from, to, page, limit } = c.req.valid('query');
  
  const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (search) {
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

    // Fetch customers manually
    let custMap: Record<string, string> = {};
    const customerIds = (rows || []).map((r: any) => r.customer_id).filter(Boolean);
    if (customerIds.length > 0) {
      const { data: custRows } = await supabase.from('customers').select('id, name').in('id', customerIds);
      for (const c of custRows || []) {
        custMap[c.id] = c.name;
      }
    }

    const formattedRows = (rows || []).map((r: any) => ({
      id: r.id,
      invoice_number: r.invoice_number,
      grand_total: r.grand_total,
      status: r.status,
      created_at: r.created_at,
      customer_name: r.customer_id ? (custMap[r.customer_id] || 'Pelanggan Umum') : null,
      payment_method: methodMap[r.id] || '-'
    }));

    return c.json({
      success: true,
      data: keysToCamel(formattedRows),
      pagination: { page: pageNum, limit: limitNum, total: count || 0 }
    }, 200);
  } catch (err: any) {
    console.error("Sales GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil riwayat transaksi" } }, 500);
  }
});

salesRoute.post('/', requirePermission('pos.write'));
salesRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const dataObj = c.req.valid('json');
    const clientTxId = dataObj.clientTransactionId || crypto.randomUUID();

    // 1. Gudang default
    const { data: whRes } = await supabase
      .from('warehouses')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_default', true)
      .limit(1)
      .single();
    if (!whRes) throw new Error("Gudang tidak ditemukan");
    const warehouseId = whRes.id;

    // 2. Totals
    let subtotal = 0;
    let discountTotal = 0;
    for (const item of dataObj.items) {
      subtotal += item.price * item.qty;
      discountTotal += item.discount * item.qty;
    }

    // 3. Validasi kepemilikan produk
    const productIds = dataObj.items.map((i) => i.productId);
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

    // 4. Loyalty points
    let appliedRedeemPoints = 0;
    let earnedPoints = 0;
    if (dataObj.customerId) {
      const { data: custData } = await supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', dataObj.customerId)
        .eq('business_id', businessId)
        .single();
      if (!custData) throw new Error("Pelanggan tidak ditemukan");

      if (dataObj.redeemPoints && dataObj.redeemPoints > 0) {
        if (custData.loyalty_points < dataObj.redeemPoints) {
          throw new Error("Poin pelanggan tidak mencukupi untuk di-redeem.");
        }
        appliedRedeemPoints = dataObj.redeemPoints;
        discountTotal += appliedRedeemPoints * 100;
      }
    }

    const grandTotal = subtotal - discountTotal;
    if (dataObj.customerId) {
      earnedPoints = Math.floor(grandTotal / 10000);
    }

    // 5. Proses seluruh transaksi dalam SATU transaksi DB (atomic, rollback jika gagal).
    // process_sale() di supabase-rls.sql menangani: idempotency, insert sale + items,
    // pengurangan stok (FOR UPDATE, tolak negatif), payments, status, piutang, loyalty.
    const { count: saleCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    const invoiceNumber = `INV/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${String((saleCount || 0) + 1).padStart(5, '0')}-${crypto.randomUUID().slice(0, 6)}`;

    const { data: result, error: rpcError } = await supabase.rpc('process_sale', {
      p_business_id: businessId,
      p_warehouse_id: warehouseId,
      p_customer_id: dataObj.customerId || null,
      p_client_transaction_id: clientTxId,
      p_invoice_number: invoiceNumber,
      p_subtotal: subtotal,
      p_discount_total: discountTotal,
      p_grand_total: grandTotal,
      p_created_by: userId,
      p_items: dataObj.items.map((i) => ({
        product_id: i.productId,
        qty: i.qty,
        price: i.price,
        discount: i.discount,
      })),
      p_payments: dataObj.payments.map((p) => ({ method: p.method, amount: p.amount })),
      p_redeem_points: appliedRedeemPoints,
      p_earned_points: earnedPoints,
      p_customer_name: dataObj.customerName || null,
      p_customer_phone: dataObj.customerPhone || null,
    });

    if (rpcError) throw rpcError;

    if (result?.duplicate) {
      return c.json({ success: true, message: "Transaksi sudah ada", data: { id: result.id } }, 200);
    }

    return c.json({ success: true, data: keysToCamel(result) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal memproses transaksi");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

salesRoute.get('/:id/document', requirePermission('pos.read'));
salesRoute.openapi(documentRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    // 1. Fetch sale data
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .select('*')
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

    let cust = { name: 'Pelanggan Umum', phone: '' };
    if (sale.customer_id) {
       const { data: cData } = await supabase.from('customers').select('name, phone').eq('id', sale.customer_id).single();
       if (cData) cust = cData;
    }
    sale.customers = cust;

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

    // We must cast Response back since Hono OpenAPI types might expect JSON if it's strict,
    // but returning Response directly works in Hono. We can cast as any.
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice-${sale.invoice_number.replace(/\//g, '-')}.pdf"`
      }
    }) as any;

  } catch (err: any) {
    console.error("PDF Generate Error:", err);
    return c.json({ success: false, error: { message: "Gagal membuat dokumen PDF" } }, 500);
  }
});

salesRoute.openapi(qrisTokenRoute, async (c) => {
  return c.json({ success: true, data: { token: 'mock-qris-token-workers' } }, 200);
});

salesRoute.post('/:id/send-wa', requirePermission('pos.read'));
salesRoute.openapi(sendWaRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  const waApiKey = c.env.WA_API_KEY;

  if (!waApiKey) {
    return c.json({ success: false, error: { message: "WA_API_KEY belum dikonfigurasi di environment" } }, 400);
  }

  try {
    const { data: sale, error } = await supabase
      .from('sales')
      .select('invoice_number, grand_total, customer_id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !sale) return c.json({ success: false, error: { message: "Transaksi tidak ditemukan" } }, 404);
    
    let customer: any = { name: 'Pelanggan Umum', phone: null };
    if (sale.customer_id) {
      const { data: cData } = await supabase.from('customers').select('name, phone').eq('id', sale.customer_id).single();
      if (cData) customer = cData;
    }
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

    return c.json({ success: true, message: "Pesan WA berhasil dikirim" }, 200);
  } catch (err) {
    console.error("Send WA Error:", err);
    return c.json({ success: false, error: { message: "Terjadi kesalahan internal" } }, 500);
  }
});

salesRoute.post('/:id/send-email', requirePermission('pos.read'));
salesRoute.openapi(sendEmailRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  const emailApiKey = c.env.EMAIL_API_KEY;

  if (!emailApiKey) {
    return c.json({ success: false, error: { message: "EMAIL_API_KEY belum dikonfigurasi di environment" } }, 400);
  }

  try {
    const { data: sale, error } = await supabase
      .from('sales')
      .select('invoice_number, grand_total, customer_id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !sale) return c.json({ success: false, error: { message: "Transaksi tidak ditemukan" } }, 404);
    
    let customer: any = { name: 'Pelanggan Umum', email: null };
    if (sale.customer_id) {
      const { data: cData } = await supabase.from('customers').select('name, email').eq('id', sale.customer_id).single();
      if (cData) customer = cData;
    }
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

    return c.json({ success: true, message: "Email berhasil dikirim" }, 200);
  } catch (err) {
    console.error("Send Email Error:", err);
    return c.json({ success: false, error: { message: "Terjadi kesalahan internal" } }, 500);
  }
});
