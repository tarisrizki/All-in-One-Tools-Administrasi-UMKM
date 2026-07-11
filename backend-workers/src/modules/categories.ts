import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(255).openapi({ example: 'Makanan' }),
  description: z.string().nullable().optional().openapi({ example: 'Kategori makanan ringan' }),
});

const categoryResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  businessId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  createdAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
  updatedAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
});

const categoriesListRoute = createRoute({
  tags: ['Categories'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar semua kategori milik bisnis',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(categoryResponseSchema)) } },
      description: 'Daftar kategori',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const categoryCreateRoute = createRoute({
  tags: ['Categories'],
  method: 'post',
  path: '/',
  description: 'Membuat kategori baru',
  request: {
    body: {
      content: {
        'application/json': { schema: categorySchema },
      },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(categoryResponseSchema) } },
      description: 'Kategori berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
  },
});

const categoryUpdateRoute = createRoute({
  tags: ['Categories'],
  method: 'put',
  path: '/{id}',
  description: 'Mengubah kategori yang ada',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' })
    }),
    body: {
      content: {
        'application/json': { schema: categorySchema },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(categoryResponseSchema) } },
      description: 'Kategori berhasil diubah',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input / kategori tidak ditemukan',
    },
  },
});

const categoryDeleteRoute = createRoute({
  tags: ['Categories'],
  method: 'delete',
  path: '/{id}',
  description: 'Menghapus kategori',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' })
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Kategori berhasil dihapus',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Gagal menghapus',
    },
  },
});


type Variables = { businessId: string; userId: string; roleId: string };
export const categoriesRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

// Gunakan authMiddleware yang asli untuk melindungi semua endpoint categories
categoriesRoute.use('*', authMiddleware);

categoriesRoute.openapi(categoriesListRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    // Penggunaan .eq('business_id', businessId) sangat krusial karena kita mem-bypass RLS dengan service_role
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }
    return c.json({ success: true, data: keysToCamel(data || []) }, 200);
  } catch (err: any) {
    console.error("Categories GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil kategori" } }, 500);
  }
});

categoriesRoute.openapi(categoryCreateRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const dataObj = c.req.valid('json');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        description: dataObj.description
      })
      .select();

    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

categoriesRoute.openapi(categoryUpdateRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const dataObj = c.req.valid('json');

    const { data, error } = await supabase
      .from('categories')
      .update({
        name: dataObj.name,
        description: dataObj.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', businessId) // WAJIB untuk isolasi data!
      .select();

    if (error || !data || data.length === 0) throw new Error("Gagal mengupdate atau kategori tidak ditemukan");
    return c.json({ success: true, data: keysToCamel(data[0]) }, 200);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

categoriesRoute.openapi(categoryDeleteRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId); // WAJIB untuk isolasi data!

    if (error) throw error;
    return c.json({ success: true, message: "Kategori berhasil dihapus" }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message } }, 400);
  }
});
