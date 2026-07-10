import { verify } from 'hono/jwt';
import type { Context, Next } from 'hono';
import { getSupabase } from '../utils/supabase';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { message: 'Token tidak ditemukan atau format salah' } }, 401);
  }

  const token = authHeader.split(' ')[1];
  
  // Ambil secret dari environment. Jangan pernah hardcode rahasia di sini!
  const jwtSecret = c.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("CRITICAL: JWT_SECRET is not set in environment!");
    return c.json({ success: false, error: { message: 'Konfigurasi server bermasalah' } }, 500);
  }

  try {
    // Verifikasi JWT asli, bukan sekadar memalsukan header
    const decoded = await verify(token, jwtSecret, 'HS256');
    
    // Pastikan payload memiliki struktur yang diharapkan
    if (!decoded.userId || !decoded.businessId || !decoded.roleId) {
      throw new Error('Payload token tidak valid');
    }

    // Set context variable agar bisa dipakai oleh route berikutnya
    c.set('userId', decoded.userId);
    c.set('businessId', decoded.businessId);
    c.set('roleId', decoded.roleId);

    await next();
  } catch (err: any) {
    console.error("JWT Verification failed:", err.message);
    return c.json({ success: false, error: { message: 'Sesi tidak valid atau telah kedaluwarsa' } }, 401);
  }
};

export const requirePermission = (requiredPermission: string) => {
  return async (c: Context, next: Next) => {
    try {
      const roleId = c.get('roleId');
      if (!roleId) return c.json({ success: false, error: { message: 'Tidak ada informasi peran' } }, 401);

      const supabase = getSupabase(c.env);
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
        return await next();
      }

      // Exact match
      if (perms.includes(requiredPermission)) {
        return await next();
      }

      // Prefix match (e.g., required: "settings.manage", has: "settings")
      const baseModule = requiredPermission.split(".")[0];
      if (perms.includes(baseModule)) {
        return await next();
      }

      return c.json({ success: false, error: { message: `Akses ditolak: membutuhkan izin '${requiredPermission}'` } }, 403);
    } catch (err) {
      return c.json({ success: false, error: { message: 'Terjadi kesalahan saat memeriksa izin' } }, 500);
    }
  };
};
