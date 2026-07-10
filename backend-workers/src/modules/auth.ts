import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';

const registerSchema = z.object({
  phone: z.string().min(10).max(30),
  password: z.string().min(6).max(255),
  businessName: z.string().min(2).max(255),
});

const loginSchema = z.object({
  phone: z.string().min(10).max(30),
  password: z.string().min(6).max(255),
});

type Variables = { businessId: string; userId: string };
export const authRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  let userId = '00000000-0000-0000-0000-000000000000';
  let businessId = '00000000-0000-0000-0000-000000000000';
  
  if (c.req.header('x-business-id')) {
    businessId = c.req.header('x-business-id');
  }
  if (c.req.header('x-user-id')) {
    userId = c.req.header('x-user-id');
  }
  
  // Note: in a real environment, we'd verify the JWT here.
  // Since we use mockAuth for all other modules in this migration step,
  // we just parse headers as fallback.
  
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

authRoute.post('/register', async (c) => {
  const supabase = getSupabase(c.env);
  try {
    const body = await c.req.json();
    const { phone, password, businessName } = registerSchema.parse(body);

    // Sequential inserts to mimic transaction for Supabase REST
    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).limit(1);
    if (existingUser && existingUser.length > 0) throw new Error("Nomor HP sudah terdaftar");

    const { data: roleRes } = await supabase.from('roles').select('id').eq('name', 'owner').limit(1);
    if (!roleRes || roleRes.length === 0) throw new Error("Role owner tidak ditemukan di database");
    const ownerRoleId = roleRes[0].id;

    const { data: bizData, error: bizErr } = await supabase.from('businesses').insert({ name: businessName }).select('id');
    if (bizErr) throw bizErr;
    const businessId = bizData[0].id;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data: userData, error: userErr } = await supabase.from('users').insert({
      business_id: businessId,
      role_id: ownerRoleId,
      name: "Owner",
      phone,
      password_hash: passwordHash
    }).select('id');
    
    if (userErr) {
       await supabase.from('businesses').delete().eq('id', businessId);
       throw userErr;
    }
    const userId = userData[0].id;

    await supabase.from('warehouses').insert({
      business_id: businessId,
      name: "Gudang Utama",
      is_default: true
    });

    await supabase.from('categories').insert({
      business_id: businessId,
      name: "Umum",
      description: "Kategori default"
    });

    const jwtSecret = c.env.JWT_SECRET || 'super-secret-key-for-dev';
    const token = await sign({ userId, businessId, roleId: ownerRoleId }, jwtSecret);

    return c.json({
      success: true,
      data: keysToCamel({ token, userId, businessId }),
    }, 201);
  } catch (err: any) {
    const message = err.issues ? "Input tidak valid" : (err.message || "Gagal mendaftar");
    return c.json({ success: false, error: { code: "REGISTER_FAILED", message } }, 400);
  }
});

authRoute.post('/login', async (c) => {
  const supabase = getSupabase(c.env);
  try {
    const body = await c.req.json();
    const { phone, password } = loginSchema.parse(body);

    const { data: userRes, error } = await supabase.from('users').select('*').eq('phone', phone).limit(1);
    if (error || !userRes || userRes.length === 0) {
      return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nomor HP atau kata sandi salah" } }, 401);
    }

    const user = userRes[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Nomor HP atau kata sandi salah" } }, 401);
    }

    const jwtSecret = c.env.JWT_SECRET || 'super-secret-key-for-dev';
    const token = await sign({ userId: user.id, businessId: user.business_id, roleId: user.role_id }, jwtSecret);

    return c.json({ success: true, data: keysToCamel({ token, userId: user.id, businessId: user.business_id }) });
  } catch (err: any) {
    const message = err.issues ? "Input tidak valid" : (err.message || "Gagal masuk");
    return c.json({ success: false, error: { code: "LOGIN_FAILED", message } }, 400);
  }
});

authRoute.get('/me', mockAuth, async (c) => {
  const supabase = getSupabase(c.env);
  const userId = c.get('userId');
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name, phone, businesses(name), roles(name, permissions)')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      return c.json({ success: false, error: { code: "NOT_FOUND", message: "Pengguna tidak ditemukan" } }, 404);
    }
    
    const { businesses, roles, ...rest } = userData;
    return c.json({
      success: true, 
      data: keysToCamel({
         ...rest,
         business_name: businesses?.name || null,
         role_name: roles?.name || null,
         permissions: roles?.permissions || []
      })
    });
  } catch (err: any) {
    return c.json({ success: false, error: { code: "FETCH_ME_FAILED", message: err.message || "Terjadi kesalahan" } }, 400);
  }
});

authRoute.post('/refresh', async (c) => {
  return c.json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Refresh token belum diimplementasi pada v1" } }, 501);
});

authRoute.post('/logout', async (c) => {
  return c.json({ success: true, message: "Logout berhasil, hapus token di client" }, 200);
});
