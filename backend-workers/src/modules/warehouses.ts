import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

const createWarehouseSchema = z.object({
  name: z.string().min(1, "Nama gudang wajib diisi").max(255),
  address: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.extend({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
});

type Variables = { businessId: string };
export const warehousesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

// Mock auth middleware (sama seperti categories)
const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  await next();
};

warehousesRoute.use('*', mockAuth);

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
    return c.json({ success: true, data: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengambil gudang" } }, 500);
  }
});

warehousesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const { name, address, is_default } = createWarehouseSchema.parse(body);

    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        business_id: businessId,
        name,
        address: address || null,
        is_default: is_default || false,
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
    const { name, address, is_default, is_active } = updateWarehouseSchema.parse(body);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('warehouses')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return c.json({ success: false, error: { message: "Gudang tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
