import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';

const roleSchema = z.object({
  name: z.string().min(1, "Nama role wajib diisi").max(50),
  description: z.string().nullable().optional(),
  permissions: z.array(z.string())
});

type Variables = { businessId: string; userId: string };
export const rolesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

rolesRoute.use('*', mockAuth);

rolesRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, permissions')
      .neq('name', 'owner')
      .or(`business_id.eq.${businessId},business_id.is.null`)
      .order('name', { ascending: true });

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil role" } }, 500);
  }
});

rolesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const dataObj = roleSchema.parse(body);

    const { data, error } = await supabase
      .from('roles')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        description: dataObj.description,
        permissions: dataObj.permissions
      })
      .select();

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

rolesRoute.put('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const dataObj = roleSchema.parse(body);

    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (roleError || !roleData) throw new Error("Role tidak ditemukan");
    if (['owner', 'admin', 'cashier'].includes(roleData.name)) {
      throw new Error("Role bawaan sistem tidak dapat diubah");
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('roles')
      .update({
        name: dataObj.name,
        description: dataObj.description,
        permissions: dataObj.permissions
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (updateError) throw updateError;
    return c.json({ success: true, data: keysToCamel(updatedData[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

rolesRoute.delete('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (roleError || !roleData) throw new Error("Role tidak ditemukan");
    if (['owner', 'admin', 'cashier'].includes(roleData.name)) {
      throw new Error("Role bawaan sistem tidak dapat dihapus");
    }

    const { data: usersData } = await supabase
      .from('users')
      .select('id')
      .eq('role_id', id)
      .eq('business_id', businessId)
      .limit(1);

    if (usersData && usersData.length > 0) {
      throw new Error("Tidak dapat menghapus role yang sedang digunakan oleh karyawan");
    }

    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (deleteError) throw deleteError;
    return c.json({ success: true, message: "Role berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message } }, 400);
  }
});
