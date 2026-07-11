import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

const roleSchema = z.object({
  name: z.string().min(1, "Nama role wajib diisi").max(50),
  description: z.string().nullable().optional(),
  permissions: z.array(z.string())
});

const roleResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  permissions: z.array(z.string()),
}).passthrough();

const listRoute = createRoute({
  tags: ['Roles'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar role',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(roleResponseSchema)) } },
      description: 'Daftar role',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const createRouteDef = createRoute({
  tags: ['Roles'],
  method: 'post',
  path: '/',
  description: 'Membuat role baru',
  request: {
    body: {
      content: { 'application/json': { schema: roleSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(roleResponseSchema) } },
      description: 'Role dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Input tidak valid',
    },
  },
});

const updateRoute = createRoute({
  tags: ['Roles'],
  method: 'put',
  path: '/{id}',
  description: 'Mengubah role',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: roleSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(roleResponseSchema) } },
      description: 'Role diubah',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Role bawaan tidak bisa diubah',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Role tidak ditemukan',
    },
  },
});

const deleteRoute = createRoute({
  tags: ['Roles'],
  method: 'delete',
  path: '/{id}',
  description: 'Menghapus role',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Role dihapus',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Role tidak bisa dihapus',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Role tidak ditemukan',
    },
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const rolesRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

rolesRoute.use('*', authMiddleware);

rolesRoute.get('/', requirePermission('roles.manage'));
rolesRoute.openapi(listRoute, async (c) => {
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

    return c.json({ success: true, data: keysToCamel(data || []) }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil role" } }, 500);
  }
});

rolesRoute.post('/', requirePermission('roles.manage'));
rolesRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const dataObj = c.req.valid('json');

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

rolesRoute.put('/:id', requirePermission('roles.manage'));
rolesRoute.openapi(updateRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const dataObj = c.req.valid('json');

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

    return c.json({ success: true, data: keysToCamel(updatedRole) }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengubah role" } }, 400);
  }
});

rolesRoute.delete('/:id', requirePermission('roles.manage'));
rolesRoute.openapi(deleteRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

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

    return c.json({ success: true, message: "Role berhasil dihapus" }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghapus role" } }, 400);
  }
});
