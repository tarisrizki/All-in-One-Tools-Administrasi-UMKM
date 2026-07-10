import { Hono } from 'hono';
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
import { cashbookRoute } from './modules/cashbook';
import { debtsRoute } from './modules/debts';
import { purchasesRoute } from './modules/purchases';
import { reportsRoute } from './modules/reports';
import { authRoute } from './modules/auth';
import { rolesRoute } from './modules/roles';
import { settingsRoute } from './modules/settings';
import { syncRoute } from './modules/sync';
import { getSupabase } from './utils/supabase';
import { rateLimitMiddleware } from './middleware/rateLimit';

const app = new Hono<{ Bindings: any }>();

app.use('*', logger());
app.use('*', async (c, next) => {
  const allowedOrigin = c.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  return cors({
    origin: (origin) => {
      return origin === allowedOrigin ? allowedOrigin : null;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'x-business-id', 'x-user-id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })(c, next);
});
app.use('*', rateLimitMiddleware);

// Global error handler
app.onError((err, c) => {
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
app.route('/cashbook', cashbookRoute);
app.route('/debts', debtsRoute);
app.route('/purchases', purchasesRoute);
app.route('/reports', reportsRoute);
app.route('/auth', authRoute);
app.route('/roles', rolesRoute);
app.route('/settings', settingsRoute);
app.route('/sync', syncRoute);

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    console.log(`Cron trigger (backup/cleanup) fired at ${new Date().toISOString()}`);
    const supabase = getSupabase(env);

    try {
      // 1. Fetch all businesses
      const { data: businesses, error: bizErr } = await supabase.from('businesses').select('id');
      if (bizErr || !businesses) throw new Error("Gagal mengambil daftar bisnis");

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      // 2. Process backup for each business
      for (const biz of businesses) {
        const businessId = biz.id;
        console.log(`Mulai backup untuk bisnis: ${businessId}`);

        // Fetch vital data
        const [salesRes, purchasesRes, cashbookRes, debtsRes] = await Promise.all([
          supabase.from('sales').select('*, sale_items(*)').eq('business_id', businessId),
          supabase.from('purchase_orders').select('*, purchase_order_items(*)').eq('business_id', businessId),
          supabase.from('cashbook_entries').select('*').eq('business_id', businessId),
          supabase.from('debts').select('*').eq('business_id', businessId)
        ]);

        const backupData = {
          date: new Date().toISOString(),
          sales: salesRes.data || [],
          purchases: purchasesRes.data || [],
          cashbook: cashbookRes.data || [],
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
