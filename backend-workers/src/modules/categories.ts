import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(255),
  description: z.string().nullable().optional()
});

type Variables = { businessId: string; userId: string; roleId: string };
export const categoriesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

// Gunakan authMiddleware yang asli untuk melindungi semua endpoint categories
categoriesRoute.use('*', authMiddleware);

categoriesRoute.get('/', async (c) => {
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
    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    console.error("Categories GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil kategori" } }, 500);
  }
});

categoriesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const dataObj = categorySchema.parse(body);

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

categoriesRoute.put('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const dataObj = categorySchema.parse(body);

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
    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

categoriesRoute.delete('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId); // WAJIB untuk isolasi data!

    if (error) throw error;
    return c.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message } }, 400);
  }
});
