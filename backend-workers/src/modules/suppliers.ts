import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nama supplier wajib diisi').max(255),
  contact_name: z.string().max(255).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().nullable().optional(),
  email: z.string().max(255).nullable().optional(),
});

const updateSupplierSchema = createSupplierSchema.extend({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const suppliersRoute = new Hono<{ Bindings: any, Variables: Variables }>();

suppliersRoute.use('*', authMiddleware);

suppliersRoute.get('/', requirePermission('purchases.read'), async (c) => {
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
    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    console.error("Suppliers GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil daftar supplier" } }, 500);
  }
});

suppliersRoute.post('/', requirePermission('purchases.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const dataObj = createSupplierSchema.parse(body);

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        contact_name: dataObj.contact_name,
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

suppliersRoute.put('/:id', requirePermission('purchases.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const dataObj = updateSupplierSchema.parse(body);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (dataObj.name !== undefined) updateData.name = dataObj.name;
    if (dataObj.contact_name !== undefined) updateData.contact_name = dataObj.contact_name;
    if (dataObj.phone !== undefined) updateData.phone = dataObj.phone;
    if (dataObj.address !== undefined) updateData.address = dataObj.address;
    if (dataObj.email !== undefined) updateData.email = dataObj.email;
    if (dataObj.is_active !== undefined) updateData.is_active = dataObj.is_active;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error || !data || data.length === 0) {
      return c.json({ success: false, error: { message: "Supplier tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
