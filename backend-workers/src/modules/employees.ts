import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authMiddleware, requirePermission } from '../middleware/auth';

const employeeCreateSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  phone: z.string().min(1, 'Nomor HP wajib diisi').max(30),
  password: z.string().min(6, 'Password minimal 6 karakter').max(255),
  role_id: z.string().uuid('Role ID tidak valid'),
});

const employeeUpdateStatusSchema = z.object({
  is_active: z.boolean(),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const employeesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

employeesRoute.use('*', authMiddleware, requirePermission('employees'));

employeesRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, email, is_active, roles(id, name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    // Flatten the roles object to match old response
    const formattedData = (data || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      is_active: user.is_active,
      role_id: user.roles?.id,
      role_name: user.roles?.name
    }));

    return c.json({ success: true, data: keysToCamel(formattedData) });
  } catch (err: any) {
    console.error("Employees GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil daftar karyawan" } }, 500);
  }
});

employeesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const dataObj = employeeCreateSchema.parse(body);

    // Validate role
    const { data: role, error: roleErr } = await supabase.from('roles').select('id').eq('id', dataObj.role_id).eq('business_id', businessId).single();
    if (roleErr || !role) throw new Error("Role tidak valid atau bukan milik bisnis ini");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dataObj.password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert({
        business_id: businessId,
        role_id: dataObj.role_id,
        name: dataObj.name,
        phone: dataObj.phone,
        password_hash: passwordHash
      })
      .select('id, name, phone');

    if (error) {
      if (error.code === '23505') {
        return c.json({ success: false, error: { message: "Nomor HP sudah terdaftar" } }, 400);
      }
      throw error;
    }

    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
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
    const dataObj = employeeUpdateStatusSchema.parse(body);

    if (id === userId) {
      return c.json({ success: false, error: { message: "Tidak dapat menonaktifkan akun sendiri" } }, 400);
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: dataObj.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select('id, is_active');

    if (error || !data || data.length === 0) {
      return c.json({ success: false, error: { message: "Karyawan tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
