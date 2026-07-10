import { verify } from 'hono/jwt';
import type { Context, Next } from 'hono';

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
