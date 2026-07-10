import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

const customerSchema = z.object({
  name: z.string().min(1, "Nama pelanggan wajib diisi").max(255),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  address: z.string().nullable().optional(),
});

type Variables = { businessId: string; userId: string };
export const customersRoute = new Hono<{ Bindings: any, Variables: Variables }>();

// Mock auth middleware
const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

customersRoute.use('*', mockAuth);

customersRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const search = c.req.query('search');

  try {
    let query = supabase
      .from('customers')
      .select('*, sales(grand_total, status)')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = (data || []).map((c: any) => {
      const sales = c.sales || [];
      const totalSpent = sales
        .filter((s: any) => s.status === 'paid')
        .reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
      
      let tier = 'Reguler';
      if (totalSpent >= 5000000) tier = 'Gold';
      else if (totalSpent >= 1000000) tier = 'Silver';
      
      const { sales: _, ...rest } = c;
      return { ...rest, total_spent: totalSpent, tier };
    });

    return c.json({ success: true, data: keysToCamel(result) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengambil pelanggan" } }, 500);
  }
});

customersRoute.get('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*, sales(grand_total, status)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
         return c.json({ success: false, error: { message: "Pelanggan tidak ditemukan" } }, 404);
      }
      throw error;
    }

    const salesList = data.sales || [];
    const totalSpent = salesList
      .filter((s: any) => s.status === 'paid')
      .reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    
    let tier = 'Reguler';
    if (totalSpent >= 5000000) tier = 'Gold';
    else if (totalSpent >= 1000000) tier = 'Silver';

    const { sales: _, ...rest } = data;
    const finalData = { ...rest, total_spent: totalSpent, tier };

    return c.json({ success: true, data: keysToCamel(finalData) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengambil pelanggan" } }, 500);
  }
});

customersRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const { name, phone, email, address } = customerSchema.parse(body);

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        created_by: userId
      })
      .select();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

customersRoute.put('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { name, phone, email, address } = customerSchema.parse(body);

    const { data, error } = await supabase
      .from('customers')
      .update({
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return c.json({ success: false, error: { message: "Pelanggan tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
