import { Hono } from 'hono';

type Variables = { businessId: string; userId: string };
export const backupRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

backupRoute.use('*', mockAuth);

// Fitur backup berbasis shell script/pg_dump tidak dapat dijalankan secara langsung
// di lingkungan Cloudflare Workers yang stateless dan tidak punya akses sistem operasi.
// Sebagai bagian migrasi, endpoint ini dibiarkan merespon dengan status Not Implemented (501)
// Karena backup seharusnya di-handle di level Supabase Dashboard secara otomatis.

backupRoute.post('/trigger', async (c) => {
  return c.json({ success: false, message: "Backup native pg_dump tidak didukung di Workers. Gunakan fitur backup otomatis dari dashboard Supabase." }, 501);
});

backupRoute.get('/list', async (c) => {
  // Return empty list instead of failing
  return c.json({ success: true, data: [] });
});

backupRoute.post('/restore', async (c) => {
  return c.json({ success: false, error: { message: "Restore via docker/pg_restore tidak didukung di Workers. Gunakan dashboard Supabase." } }, 501);
});
