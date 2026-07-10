import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

const roleSchema = z.object({
  name: z.string().min(1, "Nama role wajib diisi").max(50),
  description: z.string().nullable().optional(),
  permissions: z.array(z.string())
});

type Variables = { businessId: string; userId: string; roleId: string };
export const rolesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

rolesRoute.use('*', authMiddleware);

rolesRoute.get('/', requirePermission('roles.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, permissions')
      .neq('name', 'owner')
      .or(`business_id.is.null,business_id.eq.${businessId}`)
      .order('name', { ascending: true });

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil role" } }, 500);
  }
});

rolesRoute.post('/', requirePermission('roles.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const dataObj = roleSchema.parse(body);

    const { data: newRole, error } = await supabase
      .from('roles')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        description: dataObj.description || null,
        permissions: dataObj.permissions
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(newRole) }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal membuat role" } }, 400);
  }
});

rolesRoute.put('/:id', requirePermission('roles.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const dataObj = roleSchema.parse(body);

    const { data: roleToUpdate } = await supabase.from('roles').select('name').eq('id', id).eq('business_id', businessId).single();
    if (!roleToUpdate) return c.json({ success: false, error: { message: "Role tidak ditemukan" } }, 404);
    if (['owner', 'admin', 'cashier'].includes(roleToUpdate.name)) {
      return c.json({ success: false, error: { message: "Role bawaan sistem tidak dapat diubah" } }, 400);
    }

    const { data: updatedRole, error } = await supabase
      .from('roles')
      .update({
        name: dataObj.name,
        description: dataObj.description || null,
        permissions: dataObj.permissions
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(updatedRole) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengubah role" } }, 400);
  }
});

rolesRoute.delete('/:id', requirePermission('roles.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: roleToDelete } = await supabase.from('roles').select('name').eq('id', id).eq('business_id', businessId).single();
    if (!roleToDelete) return c.json({ success: false, error: { message: "Role tidak ditemukan" } }, 404);
    if (['owner', 'admin', 'cashier'].includes(roleToDelete.name)) {
      return c.json({ success: false, error: { message: "Role bawaan sistem tidak dapat dihapus" } }, 400);
    }

    const { data: usersWithRole } = await supabase.from('users').select('id').eq('role_id', id).eq('business_id', businessId).limit(1).single();
    if (usersWithRole) {
      return c.json({ success: false, error: { message: "Tidak dapat menghapus role yang sedang digunakan oleh karyawan" } }, 400);
    }

    await supabase.from('roles').delete().eq('id', id).eq('business_id', businessId);

    return c.json({ success: true, message: "Role berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghapus role" } }, 400);
  }
});
