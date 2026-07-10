import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Nama gudang wajib diisi').max(255),
  address: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.extend({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const warehousesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

// Semua endpoint butuh autentikasi dan izin 'settings.manage'
warehousesRoute.use('*', authMiddleware, requirePermission('settings.manage'));

warehousesRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil daftar gudang" } }, 500);
  }
});

warehousesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const dataObj = createWarehouseSchema.parse(body);

    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        address: dataObj.address,
        is_default: dataObj.is_default || false,
      })
      .select();

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

warehousesRoute.put('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const dataObj = updateWarehouseSchema.parse(body);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (dataObj.name !== undefined) updateData.name = dataObj.name;
    if (dataObj.address !== undefined) updateData.address = dataObj.address;
    if (dataObj.is_default !== undefined) updateData.is_default = dataObj.is_default;
    if (dataObj.is_active !== undefined) updateData.is_active = dataObj.is_active;

    const { data, error } = await supabase
      .from('warehouses')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error || !data || data.length === 0) {
      return c.json({ success: false, error: { message: "Gudang tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
