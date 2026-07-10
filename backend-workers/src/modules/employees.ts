import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

const employeeCreateSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(255),
  phone: z.string().min(1, "Nomor HP wajib diisi").max(30),
  password: z.string().min(6, "Password minimal 6 karakter").max(255),
  role_id: z.string().uuid("Role ID tidak valid"),
});

const employeeUpdateStatusSchema = z.object({
  is_active: z.boolean(),
});

type Variables = { businessId: string; userId: string };
export const employeesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

// Mock auth middleware
const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

employeesRoute.use('*', mockAuth);

employeesRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, email, is_active, role_id, roles(name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Flatten nested join to match old format
    const formattedData = (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      email: d.email,
      is_active: d.is_active,
      role_id: d.role_id,
      role_name: d.roles?.name || null
    }));

    return c.json({ success: true, data: keysToCamel(formattedData) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengambil karyawan" } }, 500);
  }
});

employeesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const { name, phone, password, role_id } = employeeCreateSchema.parse(body);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert({
        business_id: businessId,
        role_id,
        name,
        phone,
        password_hash: passwordHash
      })
      .select('id, name, phone');

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    if (err.code === '23505') {
      return c.json({ success: false, error: { message: "Nomor HP sudah terdaftar" } }, 400);
    }
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

employeesRoute.put('/:id/status', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { is_active } = employeeUpdateStatusSchema.parse(body);

    if (id === userId) {
      return c.json({ success: false, error: { message: "Tidak dapat menonaktifkan akun sendiri" } }, 400);
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select('id, is_active');

    if (error) throw error;
    if (!data || data.length === 0) {
      return c.json({ success: false, error: { message: "Karyawan tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
