import { verify } from 'hono/jwt';
import type { Context, Next } from 'hono';
import { getSupabase } from '../utils/supabase';
import { getEnv } from '../utils/env';

// Cache untuk is_active user (60s TTL)
const isActiveCache = new Map<string, { value: boolean; expiresAt: number }>();

async function checkUserActive(supabase: any, userId: string): Promise<boolean> {
  const now = Date.now();
  const cached = isActiveCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const { data, error } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', userId)
    .single();

  const isActive = !error && data?.is_active === true;
  isActiveCache.set(userId, { value: isActive, expiresAt: now + 60 * 1000 });
  return isActive;
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { message: 'Token tidak ditemukan atau format salah' } }, 401);
  }

  const token = authHeader.split(' ')[1];
  
  // Ambil secret dari environment. Jangan pernah hardcode rahasia di sini!
  const jwtSecret = getEnv(c, 'JWT_SECRET');
  if (!jwtSecret) {
    console.error("CRITICAL: JWT_SECRET is not set in environment!");
    return c.json({ success: false, error: { message: 'Konfigurasi server bermasalah' } }, 500);
  }

  try {
      // Verifikasi JWT asli, bukan sekadar memalsukan header
      const decoded = await verify(token, jwtSecret, 'HS256');

      // Tolak refresh token yang dipakai sebagai access token
      if ((decoded as any).type && (decoded as any).type !== 'access') {
        throw new Error('Token type tidak valid');
      }

      // Pastikan payload memiliki struktur yang diharapkan
      if (!decoded.userId || !decoded.businessId || !decoded.roleId) {
        throw new Error('Payload token tidak valid');
      }

    // Set context variable agar bisa dipakai oleh route berikutnya
    c.set('userId', decoded.userId);
    c.set('businessId', decoded.businessId);
    c.set('roleId', decoded.roleId);

    // WS-11: cek is_active per request (bukan hanya TTL token) — 60s cache, fail-fast jika dinonaktifkan
    const supabaseActive = getSupabase(c as any);
    const active = await checkUserActive(supabaseActive, decoded.userId as string);
    if (!active) {
      return c.json({ success: false, error: { message: 'Akun dinonaktifkan' } }, 401);
    }

    await next();
  } catch (err: any) {
    console.error("JWT Verification failed:", err.message);
    return c.json({ success: false, error: { message: 'Sesi tidak valid atau telah kedaluwarsa' } }, 401);
  }
};

// WS-07: outlet scope helpers
const outletScopeCache = new Map<string, { outlets: string[]; expiresAt: number }>();
async function getUserOutlets(supabase: any, userId: string): Promise<string[]> {
  const now = Date.now();
  const cached = outletScopeCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.outlets;
  const { data } = await supabase.from('user_outlets').select('outlet_id').eq('user_id', userId);
  const ids: string[] = (data || []).map((r: any) => r.outlet_id).filter(Boolean);
  outletScopeCache.set(userId, { outlets: ids, expiresAt: now + 60 * 1000 });
  return ids;
}

export const requirePermission = (requiredPermission: string) => {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get('userId');
      const roleId = c.get('roleId');
      const businessId = c.get('businessId');
      if (!roleId) return c.json({ success: false, error: { message: 'Tidak ada informasi peran' } }, 401);

      // Cek is_active user (cache 60s)
      const supabase = getSupabase(c as any);
      const isActive = await checkUserActive(supabase, userId);
      if (!isActive) {
        return c.json({ success: false, error: { message: 'Akun dinonaktifkan' } }, 401);
      }

      const { data, error } = await supabase
        .from('roles')
        .select('permissions')
        .eq('id', roleId)
        .single();

      if (error || !data) {
        return c.json({ success: false, error: { message: 'Role tidak ditemukan' } }, 403);
      }

      const perms: string[] = Array.isArray(data.permissions) ? data.permissions : [];
      
      // Admin / Owner override
      if (perms.includes("*")) {
        // tetap isi outlet scope untuk downstream use (IDOR: filter sales/purchase by allowed outlets)
        if (businessId && userId) {
          const outlets = await getUserOutlets(supabase, userId);
          c.set('outletIds' as any, outlets);
          // jika header x-outlet-id diminta, validasi milik business & assignment
          const requestedOutlet = c.req.header('x-outlet-id');
          if (requestedOutlet) {
            if (outlets.length > 0 && !outlets.includes(requestedOutlet)) {
              return c.json({ success: false, error: { message: 'Outlet tidak dalam cakupan Anda (IDOR guard)' } }, 403);
            }
            // validasi outlet milik business
            const { data: outletRow } = await supabase.from('outlets').select('id').eq('id', requestedOutlet).eq('business_id', businessId).single();
            if (!outletRow) return c.json({ success: false, error: { message: 'Outlet tidak ditemukan' } }, 404);
            c.set('outletId' as any, requestedOutlet);
          }
        }
        return await next();
      }

      // Exact match
      if (perms.includes(requiredPermission)) {
        if (businessId && userId) {
          const outlets = await getUserOutlets(supabase, userId);
          c.set('outletIds' as any, outlets);
          const requestedOutlet = c.req.header('x-outlet-id');
          if (requestedOutlet) {
            if (outlets.length > 0 && !outlets.includes(requestedOutlet)) {
              return c.json({ success: false, error: { message: 'Outlet tidak dalam cakupan Anda (IDOR guard)' } }, 403);
            }
            const { data: outletRow } = await supabase.from('outlets').select('id').eq('id', requestedOutlet).eq('business_id', businessId).single();
            if (!outletRow) return c.json({ success: false, error: { message: 'Outlet tidak ditemukan' } }, 404);
            c.set('outletId' as any, requestedOutlet);
          }
        }
        return await next();
      }

      // Prefix match (e.g., required: "settings.manage", has: "settings")
      const baseModule = requiredPermission.split(".")[0];
      if (perms.includes(baseModule)) {
        if (businessId && userId) {
          const outlets = await getUserOutlets(supabase, userId);
          c.set('outletIds' as any, outlets);
          const requestedOutlet = c.req.header('x-outlet-id');
          if (requestedOutlet) {
            if (outlets.length > 0 && !outlets.includes(requestedOutlet)) {
              return c.json({ success: false, error: { message: 'Outlet tidak dalam cakupan Anda (IDOR guard)' } }, 403);
            }
            const { data: outletRow } = await supabase.from('outlets').select('id').eq('id', requestedOutlet).eq('business_id', businessId).single();
            if (!outletRow) return c.json({ success: false, error: { message: 'Outlet tidak ditemukan' } }, 404);
            c.set('outletId' as any, requestedOutlet);
          }
        }
        return await next();
      }

      return c.json({ success: false, error: { message: `Akses ditolak: membutuhkan izin '${requiredPermission}'` } }, 403);
    } catch (err) {
      return c.json({ success: false, error: { message: 'Terjadi kesalahan saat memeriksa izin' } }, 500);
    }
  };
};

// WS-07: scope helper untuk modul (dipakai sales/purchase/outlet binding)
// ponytail: ceiling — no descendant expansion; add recursive outlet tree when deep hierarchy needed
export async function assertOutletAccess(c: Context, outletId: string): Promise<{ ok: boolean; message?: string }> {
  const userId = c.get('userId');
  const businessId = c.get('businessId');
  if (!outletId) return { ok: false, message: 'outlet_id wajib' };
  const supabase = getSupabase((c as any).env);
  const { data: outletRow } = await supabase.from('outlets').select('id,business_id').eq('id', outletId).single();
  if (!outletRow) return { ok: false, message: 'Outlet tidak ditemukan' };
  if (outletRow.business_id !== businessId) return { ok: false, message: 'Outlet bukan milik bisnis ini (IDOR)' };
  const allowed = await getUserOutlets(supabase, userId);
  if (allowed.length > 0 && !allowed.includes(outletId)) return { ok: false, message: 'Outlet di luar cakupan Anda (IDOR)' };
  return { ok: true };
}
