import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import bcrypt from 'bcryptjs';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

const employeeCreateSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255).openapi({ example: 'Andi' }),
  phone: z.string().min(1, 'Nomor HP wajib diisi').max(30).openapi({ example: '08123456789' }),
  password: z.string().min(6, 'Password minimal 6 karakter').max(255).openapi({ example: 'rahasia123' }),
  role_id: z.string().uuid('Role ID tidak valid').openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
});

const employeeUpdateStatusSchema = z.object({
  is_active: z.boolean().openapi({ example: false }),
});

const employeeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  role_id: z.string().uuid().optional(),
  role_name: z.string().nullable().optional(),
});

const employeeCreateResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable().optional(),
});

const employeeStatusResponseSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
});

const listRoute = createRoute({
  tags: ['Employees'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar karyawan milik bisnis',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(employeeResponseSchema)) } },
      description: 'Daftar karyawan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const createRouteDef = createRoute({
  tags: ['Employees'],
  method: 'post',
  path: '/',
  description: 'Membuat akun karyawan baru (maksimal 20)',
  request: {
    body: {
      content: { 'application/json': { schema: employeeCreateSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(employeeCreateResponseSchema) } },
      description: 'Karyawan berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input atau nomor HP sudah terdaftar',
    },
    403: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Kuota karyawan terpenuhi',
    }
  },
});

const updateStatusRouteDef = createRoute({
  tags: ['Employees'],
  method: 'put',
  path: '/{id}/status',
  description: 'Mengubah status aktif karyawan',
  request: {
    params: z.object({
      id: z.string().uuid()
    }),
    body: {
      content: { 'application/json': { schema: employeeUpdateStatusSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(employeeStatusResponseSchema) } },
      description: 'Status karyawan berhasil diubah',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input atau menonaktifkan akun sendiri',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Karyawan tidak ditemukan',
    }
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const employeesRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

employeesRoute.use('*', authMiddleware, requirePermission('employees'));

employeesRoute.openapi(listRoute, async (c) => {
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

    return c.json({ success: true, data: formattedData }, 200);
  } catch (err: any) {
    console.error("Employees GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil daftar karyawan" } }, 500);
  }
});

employeesRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const dataObj = c.req.valid('json');

    // Validate quota: max 20 employees
    const { count: employeeCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    
    if (countError) throw countError;
    if (employeeCount !== null && employeeCount >= 20) {
      return c.json({ success: false, error: { message: "Batas paket gratis (20 item) sudah tercapai" } }, 403);
    }

    // Validate role
    const { data: role, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('id', dataObj.role_id)
      .or(`business_id.is.null,business_id.eq.${businessId}`)
      .single();
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

    return c.json({ success: true, data: data[0] }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

employeesRoute.openapi(updateStatusRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const { id } = c.req.valid('param');

  try {
    const dataObj = c.req.valid('json');

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

    return c.json({ success: true, data: data[0] }, 200);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
