import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';

const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(255),
  description: z.string().nullable().optional(),
  sort_order: z.number().optional(),
});

type Variables = {
  businessId: string;
};

export const categoriesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

// Middleware Mock Auth Sementara (karena Fase 5 belum implementasi Auth penuh)
const mockAuth = async (c: any, next: any) => {
  // Dalam production, ini dari JWT. Untuk tes, kita ambil dari header.
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  await next();
};

categoriesRoute.use('*', mockAuth);

categoriesRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengambil kategori" } }, 500);
  }
});

categoriesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const body = await c.req.json();
    const { name, description } = categorySchema.parse(body);
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        business_id: businessId,
        name,
        description: description || null
      })
      .select();
      
    if (error) throw error;
    
    return c.json({ success: true, data: data[0] }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal menyimpan kategori" } }, 400);
  }
});
