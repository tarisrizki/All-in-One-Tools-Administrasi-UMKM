import { OpenAPIHono } from '@hono/zod-openapi';
import { basicAuth } from 'hono/basic-auth';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoute } from './modules/health';
import { categoriesRoute } from './modules/categories';
import { warehousesRoute } from './modules/warehouses';
import { suppliersRoute } from './modules/suppliers';
import { employeesRoute } from './modules/employees';
import { customersRoute } from './modules/customers';
import { productsRoute } from './modules/products';
import { salesRoute } from './modules/sales';
import { debtsRoute } from './modules/debts';
import { purchasesRoute } from './modules/purchases';
import { reportsRoute } from './modules/reports';
import { authRoute } from './modules/auth';
import { rolesRoute } from './modules/roles';
import { settingsRoute } from './modules/settings';
import { syncRoute } from './modules/sync';
import { stockOpnamesRoute } from './modules/stock_opnames';
import { subscriptionsRoute } from './modules/subscriptions';
import { paymentsRoute, webhookRoute } from './modules/payments';
// WS-05/07: orders & outlets modules — migrasi sudah ada, route ditunda ke iterasi berikutnya
import { ordersRoute } from './modules/orders';
import { getSupabase } from './utils/supabase';
import { getEnv } from './utils/env';
import { rateLimitMiddleware } from './middleware/rateLimit';

const app = new OpenAPIHono<{ Bindings: any }>();

// Body size limit middleware (~5MB) - returns 413 if exceeded
app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
    return c.json({ success: false, error: { message: 'Ukuran body melebihi batas 5MB' } }, 413);
  }
  await next();
});

app.use('*', logger());
app.use('*', async (c, next) => {
  const allowedOrigin = getEnv(c, 'ALLOWED_ORIGIN') || '';
  return cors({
    origin: (origin) => {
      if (!origin) return allowedOrigin || '*';
      // E2E/localhost: allow any localhost port + beres.lambada domains
      const allowlist = [
        'http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000',
        'http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'http://127.0.0.1:3000',
      ];
      if (allowlist.includes(origin)) return origin;
      if (origin.endsWith('.beres.lambada.my.id') || origin === 'https://beres.lambada.my.id') return origin;
      if (allowedOrigin && origin === allowedOrigin) return allowedOrigin;
      // fallback: jika ALLOWED_ORIGIN diset, hanya itu; jika tidak, izinkan localhost apa pun (E2E ponytail)
      if (!allowedOrigin && origin.startsWith('http://localhost:')) return origin;
      if (!allowedOrigin && origin.startsWith('http://127.0.0.1:')) return origin;
      return null;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'x-business-id', 'x-user-id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })(c, next);
});
app.use('*', rateLimitMiddleware);

const docsAuth = async (c: any, next: any) => {
  const hostname = new URL(c.req.url).hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const username = getEnv(c, 'DOCS_USERNAME');
    const password = getEnv(c, 'DOCS_PASSWORD');
    if (username && password) {
      const auth = basicAuth({ username, password });
      return auth(c, next);
    }
    // Fail-closed jika lupa set credentials di production
    return c.json({ success: false, error: { message: 'Unauthorized' } }, 401);
  }
  return next();
};

app.use('/docs', docsAuth);
app.use('/docs/*', docsAuth);
app.use('/openapi.json', docsAuth);

// OpenAPI Documentation
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Beres UMKM API',
    version: '1.0.0',
    description: 'API Dokumentasi untuk All-in-One Tools Administrasi UMKM',
  },
});

app.get(
  '/docs',
  apiReference({
    theme: 'kepler',
    layout: 'modern',
    spec: {
      url: '/openapi.json',
    },
  })
);

import { HTTPException } from 'hono/http-exception';

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(`[Error] ${err.message}`);
  return c.json({ success: false, error: { message: 'Terjadi kesalahan internal server' } }, 500);
});

// Route registration
app.route('/health', healthRoute);
app.route('/categories', categoriesRoute);
app.route('/warehouses', warehousesRoute);
app.route('/suppliers', suppliersRoute);
app.route('/employees', employeesRoute);
app.route('/customers', customersRoute);
app.route('/products', productsRoute);
app.route('/sales', salesRoute);
app.route('/debts', debtsRoute);
app.route('/purchases', purchasesRoute);
app.route('/reports', reportsRoute);
app.route('/auth', authRoute);
app.route('/roles', rolesRoute);
app.route('/settings', settingsRoute);
app.route('/sync', syncRoute);
app.route('/stock-opnames', stockOpnamesRoute);
app.route('/subscriptions', subscriptionsRoute);
app.route('/payments', paymentsRoute);
app.route('/webhooks', webhookRoute);
app.route('/orders', ordersRoute);
// WS-07 outlets pending module

// app.route('/outlets', outletsRoute);

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    console.log(`Cron trigger (backup/cleanup) fired at ${new Date().toISOString()}`);
    const supabase = getSupabase(env);

    try {
      // 1. Fetch all businesses
      const { data: businesses, error: bizErr } = await supabase.from('businesses').select('id, is_demo');
      if (bizErr || !businesses) throw new Error("Gagal mengambil daftar bisnis");

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      // 2. Process backup for each business
      for (const biz of businesses) {
        const businessId = biz.id;
        console.log(`Mulai proses untuk bisnis: ${businessId}`);

        // --- PHASE G: ISOLASI AKUN DEMO ---
        if (biz.is_demo) {
          console.log(`Menjalankan reset data harian untuk akun demo: ${businessId}`);
          try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const isoYesterday = yesterday.toISOString();

            // 1. Hapus transaksi 24 jam terakhir
            await supabase.from('debts').delete().eq('business_id', businessId).gte('created_at', isoYesterday);
            
            // Hapus penjualan (sale_items dihapus terlebih dahulu jika ada)
            const { data: recentSales } = await supabase.from('sales').select('id').eq('business_id', businessId).gte('created_at', isoYesterday);
            if (recentSales && recentSales.length > 0) {
              const saleIds = recentSales.map((s: any) => s.id);
              // Untuk menghindari URI too long di query jika array sangat besar,
              // pada skala demo ini array saleIds aman dikirim via filter "in".
              await supabase.from('sale_items').delete().in('sale_id', saleIds);
              await supabase.from('sales').delete().in('id', saleIds);
            }

            // 2. Reset ulang produk demo ke set data awal
            await supabase.from('product_stock').delete().eq('warehouse_id', (await supabase.from('warehouses').select('id').eq('business_id', businessId).limit(1).single()).data?.id);
            await supabase.from('products').delete().eq('business_id', businessId);
            
            const { data: defaultCat } = await supabase.from('categories').select('id').eq('business_id', businessId).limit(1).single();
            const { data: defaultWH } = await supabase.from('warehouses').select('id').eq('business_id', businessId).limit(1).single();
            
            if (defaultCat && defaultWH) {
              const { data: insertedProducts } = await supabase.from('products').insert([
                { business_id: businessId, category_id: defaultCat.id, name: 'Kopi Susu', cost_price: 10000, sell_price: 15000, min_stock: 5 },
                { business_id: businessId, category_id: defaultCat.id, name: 'Teh Manis', cost_price: 2000, sell_price: 5000, min_stock: 10 }
              ]).select();
              
              if (insertedProducts && insertedProducts.length > 0) {
                await supabase.from('product_stock').insert(
                  insertedProducts.map((p: any) => ({
                    product_id: p.id,
                    warehouse_id: defaultWH.id,
                    quantity: 50
                  }))
                );
              }
            }
          } catch (demoErr) {
            console.error(`Gagal mereset data akun demo ${businessId}:`, demoErr);
          }
        }
        // --- END PHASE G ---

        console.log(`Mulai backup untuk bisnis: ${businessId}`);

        // Fetch vital data
        const [
          rolesRes,
          employeesRes,
          categoriesRes,
          productsRes,
          customersRes,
          suppliersRes,
          warehousesRes,
          salesRes,
          purchasesRes,
          debtsRes
        ] = await Promise.all([
          supabase.from('roles').select('*').eq('business_id', businessId),
          supabase.from('users').select('*').eq('business_id', businessId),
          supabase.from('categories').select('*').eq('business_id', businessId),
          supabase.from('products').select('*, product_stock(*)').eq('business_id', businessId),
          supabase.from('customers').select('*').eq('business_id', businessId),
          supabase.from('suppliers').select('*').eq('business_id', businessId),
          supabase.from('warehouses').select('*').eq('business_id', businessId),
          supabase.from('sales').select('*, sale_items(*)').eq('business_id', businessId),
          supabase.from('purchase_orders').select('*, purchase_order_items(*)').eq('business_id', businessId),
          supabase.from('debts').select('*').eq('business_id', businessId)
        ]);

        const backupData = {
          date: new Date().toISOString(),
          roles: rolesRes.data || [],
          employees: employeesRes.data || [],
          categories: categoriesRes.data || [],
          products: productsRes.data || [],
          customers: customersRes.data || [],
          suppliers: suppliersRes.data || [],
          warehouses: warehousesRes.data || [],
          sales: salesRes.data || [],
          purchases: purchasesRes.data || [],
          debts: debtsRes.data || []
        };

        const payloadStr = JSON.stringify(backupData);
        
        // Compress using CompressionStream
        const blob = new Blob([payloadStr], { type: 'application/json' });
        const compressedStream = blob.stream().pipeThrough(new CompressionStream('gzip'));
        const compressedBlob = await new Response(compressedStream).blob();
        
        const filename = `${businessId}/${dateStr}-backup.json.gz`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('backups')
          .upload(filename, compressedBlob, {
            contentType: 'application/gzip',
            upsert: true
          });

        if (uploadError) {
          console.error(`Gagal upload backup ${filename}:`, uploadError);
        } else {
          console.log(`Selesai backup: ${filename}`);
        }

        // 3. Retention Policy: Delete backups older than 7 days
        const { data: existingFiles } = await supabase.storage.from('backups').list(businessId);
        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete: string[] = [];
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          for (const file of existingFiles) {
            if (!file.created_at) continue;
            const fileDate = new Date(file.created_at);
            if (fileDate < sevenDaysAgo) {
              filesToDelete.push(`${businessId}/${file.name}`);
            }
          }

          if (filesToDelete.length > 0) {
            await supabase.storage.from('backups').remove(filesToDelete);
            console.log(`Menghapus ${filesToDelete.length} file backup lama untuk bisnis ${businessId}`);
          }
        }
      }
      console.log("Proses cron backup berhasil diselesaikan.");
    } catch (err) {
      console.error("Cron backup gagal:", err);
    }
  }
};
