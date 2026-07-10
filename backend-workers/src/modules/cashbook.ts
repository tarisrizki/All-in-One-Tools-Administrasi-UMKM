import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

const cashbookSchema = z.object({
  type: z.enum(["in", "out"]),
  amount: z.number().min(1),
  description: z.string().min(1, "Deskripsi wajib diisi"),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const cashbookRoute = new Hono<{ Bindings: any, Variables: Variables }>();

cashbookRoute.use('*', authMiddleware);

cashbookRoute.get('/', requirePermission('cashbook.read'), async (c) => {
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
    console.error("Cashbook GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil buku kas" } }, 500);
  }
});

cashbookRoute.post('/', requirePermission('cashbook.write'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const dataObj = cashbookSchema.parse(body);

    const { data: result, error } = await supabase
      .from('cashbook_entries')
      .insert({
        business_id: businessId,
        type: dataObj.type,
        category: "Lainnya",
        amount: dataObj.amount.toString(),
        note: dataObj.description,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(result) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal menyimpan transaksi kas");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
