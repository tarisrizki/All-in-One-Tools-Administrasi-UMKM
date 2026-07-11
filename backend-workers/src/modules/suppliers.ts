import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nama supplier wajib diisi').max(255).openapi({ example: 'PT Supplier Maju' }),
  contactName: z.string().max(255).nullable().optional().openapi({ example: 'Budi' }),
  phone: z.string().max(30).nullable().optional().openapi({ example: '08123456789' }),
  address: z.string().nullable().optional().openapi({ example: 'Jl. Merdeka No 2' }),
  email: z.string().max(255).nullable().optional().openapi({ example: 'budi@supplier.com' }),
});

const updateSupplierSchema = createSupplierSchema.extend({
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
});

const supplierResponseSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string(),
  contactName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const listRoute = createRoute({
  tags: ['Suppliers'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar supplier milik bisnis',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(supplierResponseSchema)) } },
      description: 'Daftar supplier',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const createRouteDef = createRoute({
  tags: ['Suppliers'],
  method: 'post',
  path: '/',
  description: 'Membuat supplier baru',
  request: {
    body: {
      content: { 'application/json': { schema: createSupplierSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(supplierResponseSchema) } },
      description: 'Supplier berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
  },
});

const updateRouteDef = createRoute({
  tags: ['Suppliers'],
  method: 'put',
  path: '/{id}',
  description: 'Mengubah data supplier',
  request: {
    params: z.object({
      id: z.string().uuid()
    }),
    body: {
      content: { 'application/json': { schema: updateSupplierSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(supplierResponseSchema) } },
      description: 'Supplier berhasil diubah',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Supplier tidak ditemukan',
    }
  },
});


type Variables = { businessId: string; userId: string; roleId: string };
export const suppliersRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

suppliersRoute.use('*', authMiddleware);

suppliersRoute.get('/', requirePermission('purchases.read'));
suppliersRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }
    return c.json({ success: true, data: keysToCamel(data || []) }, 200);
  } catch (err: any) {
    console.error("Suppliers GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil daftar supplier" } }, 500);
  }
});

suppliersRoute.post('/', requirePermission('purchases.manage'));
suppliersRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const dataObj = c.req.valid('json');

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        contact_name: dataObj.contactName,
        phone: dataObj.phone,
        address: dataObj.address,
        email: dataObj.email
      })
      .select();

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

suppliersRoute.put('/:id', requirePermission('purchases.manage'));
suppliersRoute.openapi(updateRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const dataObj = c.req.valid('json');

    const updateData: any = { updated_at: new Date().toISOString() };
    if (dataObj.name !== undefined) updateData.name = dataObj.name;
    if (dataObj.contactName !== undefined) updateData.contact_name = dataObj.contactName;
    if (dataObj.phone !== undefined) updateData.phone = dataObj.phone;
    if (dataObj.address !== undefined) updateData.address = dataObj.address;
    if (dataObj.email !== undefined) updateData.email = dataObj.email;
    if (dataObj.isActive !== undefined) updateData.is_active = dataObj.isActive;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error || !data || data.length === 0) {
      return c.json({ success: false, error: { message: "Supplier tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) }, 200);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
