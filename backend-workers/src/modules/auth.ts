import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';
import { authMiddleware } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

const registerSchema = z.object({
  phone: z.string().regex(/^(08|628|\+628)\d{6,14}$/, "Nomor HP harus berupa nomor Indonesia yang valid"),
  password: z.string().min(6).max(255),
  businessName: z.string().min(2).max(255),
  cfTurnstileResponse: z.string().min(1, "Verifikasi keamanan (CAPTCHA) wajib diisi"),
});

const loginSchema = z.object({
  phone: z.string().min(10).max(30),
  password: z.string().min(6).max(255),
});

const authResponseSchema = z.object({
  token: z.string(),
  user_id: z.string().uuid(),
  business_id: z.string().uuid(),
  app_mode: z.string(),
  permissions: z.array(z.string()).optional(),
});

const meResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  business_name: z.string().nullable().optional(),
  business_settings: z.record(z.string(), z.any()).nullable().optional(),
  role_name: z.string().nullable().optional(),
  permissions: z.array(z.string()).nullable().optional(),
});

const registerRoute = createRoute({
  tags: ['Auth'],
  method: 'post',
  path: '/register',
  description: 'Mendaftarkan pengguna dan bisnis baru',
  request: {
    body: {
      content: { 'application/json': { schema: registerSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(authResponseSchema) } },
      description: 'Pendaftaran berhasil',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Input tidak valid / Bot terdeteksi / HP terdaftar',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const loginRoute = createRoute({
  tags: ['Auth'],
  method: 'post',
  path: '/login',
  description: 'Masuk ke aplikasi',
  request: {
    body: {
      content: { 'application/json': { schema: loginSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(authResponseSchema) } },
      description: 'Login berhasil',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Input tidak valid',
    },
    401: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Kredensial salah',
    },
  },
});

const meRoute = createRoute({
  tags: ['Auth'],
  method: 'get',
  path: '/me',
  description: 'Mendapatkan data pengguna saat ini',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(meResponseSchema) } },
      description: 'Data pengguna',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Gagal mengambil data',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Pengguna tidak ditemukan',
    }
  },
});

const refreshRoute = createRoute({
  tags: ['Auth'],
  method: 'post',
  path: '/refresh',
  description: 'Refresh token',
  responses: {
    501: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Belum diimplementasi',
    },
  },
});

const logoutRoute = createRoute({
  tags: ['Auth'],
  method: 'post',
  path: '/logout',
  description: 'Logout dari aplikasi',
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Logout berhasil',
    },
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const authRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

authRoute.openapi(registerRoute, async (c) => {
  const supabase = getSupabase(c.env);
  try {
    const { phone, password, businessName, cfTurnstileResponse } = c.req.valid('json');

    const turnstileSecret = c.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      return c.json({ success: false, error: { code: "SERVER_ERROR", message: "Konfigurasi Turnstile belum diatur di server" } }, 500);
    }

    const formData = new FormData();
    formData.append('secret', turnstileSecret);
    formData.append('response', cfTurnstileResponse);

    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    
    const turnstileOutcome: any = await turnstileRes.json();
    if (!turnstileOutcome.success) {
      return c.json({ success: false, error: { code: "BOT_DETECTED", message: "Verifikasi keamanan gagal, silakan coba lagi" } }, 400);
    }

    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).single();
    if (existingUser) return c.json({ success: false, error: { code: "REGISTER_FAILED", message: "Nomor HP sudah terdaftar" } }, 400);

    const { data: ownerRole } = await supabase.from('roles').select('id, permissions').eq('name', 'owner').single();
    if (!ownerRole) throw new Error("Role owner tidak ditemukan di database");

    const { data: business, error: bizError } = await supabase.from('businesses').insert({ name: businessName, settings: { appMode: 'simple' } }).select().single();
    if (bizError || !business) throw bizError || new Error("Gagal membuat bisnis");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data: user, error: userError } = await supabase.from('users').insert({
      business_id: business.id,
      role_id: ownerRole.id,
      name: "Owner",
      phone,
      password_hash: passwordHash
    }).select().single();
    
    if (userError || !user) throw userError || new Error("Gagal membuat user");

    await supabase.from('warehouses').insert({
      business_id: business.id,
      name: "Gudang Utama",
      is_default: true
    });

    await supabase.from('categories').insert({
      business_id: business.id,
      name: "Umum",
      description: "Kategori default"
    });

    const token = await sign({
      userId: user.id,
      businessId: business.id,
      roleId: ownerRole.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 1 week
    }, c.env.JWT_SECRET, 'HS256');

    return c.json({ 
      success: true, 
      data: { 
        token, 
        user_id: user.id, 
        business_id: business.id,
        app_mode: 'simple',
        permissions: ownerRole.permissions
      } 
    }, 201);
  } catch (err: any) {
    const message = err.issues ? "Input tidak valid" : (err.message || "Gagal mendaftar");
    return c.json({ success: false, error: { code: "REGISTER_FAILED", message } }, 400);
  }
});

authRoute.openapi(loginRoute, async (c) => {
  const supabase = getSupabase(c.env);
  try {
    const { phone, password } = c.req.valid('json');

    const { data: user } = await supabase.from('users').select('*, businesses(settings), roles(permissions)').eq('phone', phone).single();
    if (!user) {
      return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nomor HP atau kata sandi salah" } }, 401);
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nomor HP atau kata sandi salah" } }, 401);
    }

    const token = await sign({
      userId: user.id,
      businessId: user.business_id,
      roleId: user.role_id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 1 week
    }, c.env.JWT_SECRET, 'HS256');

    const appMode = (user as any).businesses?.settings?.appMode || 'full';
    const permissions = (user as any).roles?.permissions || [];

    return c.json({ success: true, data: { token, user_id: user.id, business_id: user.business_id, app_mode: appMode, permissions } }, 200);
  } catch (err: any) {
    const message = err.issues ? "Input tidak valid" : (err.message || "Gagal masuk");
    return c.json({ success: false, error: { code: "LOGIN_FAILED", message } }, 400);
  }
});

authRoute.get('/me', authMiddleware);
authRoute.openapi(meRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const userId = c.get('userId');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, phone, businesses(name, settings), roles(name, permissions)')
      .eq('id', userId)
      .single();

    if (error || !user) return c.json({ success: false, error: { code: "NOT_FOUND", message: "Pengguna tidak ditemukan" } }, 404);

    const formattedData = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      business_name: (user as any).businesses?.name,
      business_settings: (user as any).businesses?.settings,
      role_name: (user as any).roles?.name,
      permissions: (user as any).roles?.permissions
    };

    return c.json({ success: true, data: formattedData }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { code: "FETCH_ME_FAILED", message: "Terjadi kesalahan" } }, 400);
  }
});

authRoute.openapi(refreshRoute, async (c) => {
  return c.json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Refresh token belum diimplementasi" } }, 501);
});

authRoute.openapi(logoutRoute, async (c) => {
  return c.json({ success: true, message: "Logout berhasil, hapus token di client" }, 200);
});
