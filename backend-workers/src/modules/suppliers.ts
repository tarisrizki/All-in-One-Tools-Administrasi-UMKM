import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

const createSupplierSchema = z.object({
  name: z.string().min(1, "Nama supplier wajib diisi").max(255),
  contact_name: z.string().max(255).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().nullable().optional(),
  email: z.string().max(255).nullable().optional(),
});

const updateSupplierSchema = createSupplierSchema.extend({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
});

type Variables = { businessId: string };
export const suppliersRoute = new Hono<{ Bindings: any, Variables: Variables }>();

// Mock auth middleware
const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  await next();
};

suppliersRoute.use('*', mockAuth);

suppliersRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengambil supplier" } }, 500);
  }
});

suppliersRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const { name, contact_name, phone, address, email } = createSupplierSchema.parse(body);

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        business_id: businessId,
        name,
        contact_name: contact_name || null,
        phone: phone || null,
        address: address || null,
        email: email || null
      })
      .select();

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

suppliersRoute.put('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { name, contact_name, phone, address, email, is_active } = updateSupplierSchema.parse(body);

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (email !== undefined) updateData.email = email;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return c.json({ success: false, error: { message: "Supplier tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
