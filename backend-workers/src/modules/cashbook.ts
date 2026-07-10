import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

const cashbookSchema = z.object({
  type: z.enum(["in", "out"]),
  amount: z.number().min(1),
  description: z.string().min(1, "Deskripsi wajib diisi"),
});

type Variables = { businessId: string; userId: string };
export const cashbookRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

cashbookRoute.use('*', mockAuth);

cashbookRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('cashbook_entries')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil buku kas" } }, 500);
  }
});

cashbookRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const dataObj = cashbookSchema.parse(body);

    const { data, error } = await supabase
      .from('cashbook_entries')
      .insert({
        business_id: businessId,
        type: dataObj.type,
        category: "Lainnya",
        amount: dataObj.amount.toString(),
        note: dataObj.description,
        created_by: userId,
      })
      .select();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal menyimpan transaksi kas");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
