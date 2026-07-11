import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Nama gudang wajib diisi').max(255).openapi({ example: 'Gudang Pusat' }),
  address: z.string().nullable().optional().openapi({ example: 'Jl. Merdeka No 1' }),
  isDefault: z.boolean().optional().openapi({ example: true }),
});

const updateWarehouseSchema = createWarehouseSchema.extend({
  name: z.string().min(1).max(255).optional().openapi({ example: 'Gudang Cabang' }),
  isActive: z.boolean().optional().openapi({ example: true }),
});

const warehouseResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  businessId: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable().optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
  updatedAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
});

const listRoute = createRoute({
  tags: ['Warehouses'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar semua gudang milik bisnis',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(warehouseResponseSchema)) } },
      description: 'Daftar gudang',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const createRouteDef = createRoute({
  tags: ['Warehouses'],
  method: 'post',
  path: '/',
  description: 'Membuat gudang baru (maksimal 5)',
  request: {
    body: {
      content: { 'application/json': { schema: createWarehouseSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(warehouseResponseSchema) } },
      description: 'Gudang berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    403: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Kuota gudang terpenuhi',
    },
  },
});

const updateRouteDef = createRoute({
  tags: ['Warehouses'],
  method: 'put',
  path: '/{id}',
  description: 'Mengubah data gudang yang ada',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' })
    }),
    body: {
      content: { 'application/json': { schema: updateWarehouseSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(warehouseResponseSchema) } },
      description: 'Gudang berhasil diubah',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Gudang tidak ditemukan',
    }
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const warehousesRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

// Semua endpoint butuh autentikasi dan izin 'settings.manage'
warehousesRoute.use('*', authMiddleware, requirePermission('settings.manage'));

warehousesRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data || []) }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil daftar gudang" } }, 500);
  }
});

warehousesRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const dataObj = c.req.valid('json');

    // Validate quota: max 5 warehouses
    const { count: warehouseCount, error: countError } = await supabase
      .from('warehouses')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    
    if (countError) throw countError;
    if (warehouseCount !== null && warehouseCount >= 5) {
      return c.json({ success: false, error: { message: "Batas paket gratis (5 item) sudah tercapai" } }, 403);
    }

    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        address: dataObj.address,
        is_default: dataObj.isDefault || false,
      })
      .select();

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

warehousesRoute.openapi(updateRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const dataObj = c.req.valid('json');

    const updateData: any = { updated_at: new Date().toISOString() };
    if (dataObj.name !== undefined) updateData.name = dataObj.name;
    if (dataObj.address !== undefined) updateData.address = dataObj.address;
    if (dataObj.isDefault !== undefined) updateData.is_default = dataObj.isDefault;
    if (dataObj.isActive !== undefined) updateData.is_active = dataObj.isActive;

    const { data, error } = await supabase
      .from('warehouses')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error || !data || data.length === 0) {
      return c.json({ success: false, error: { message: "Gudang tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) }, 200);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
