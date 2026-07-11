import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

const cashbookSchema = z.object({
  type: z.enum(["in", "out"]),
  amount: z.number().min(1),
  description: z.string().min(1, "Deskripsi wajib diisi"),
});

const cashbookResponseSchema = z.object({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  type: z.string(),
  category: z.string().nullable().optional(),
  amount: z.string(),
  note: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
}).passthrough();

const listRoute = createRoute({
  tags: ['Cashbook'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar entri buku kas',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(cashbookResponseSchema)) } },
      description: 'Daftar buku kas',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const createRouteDef = createRoute({
  tags: ['Cashbook'],
  method: 'post',
  path: '/',
  description: 'Membuat entri buku kas',
  request: {
    body: {
      content: { 'application/json': { schema: cashbookSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(cashbookResponseSchema) } },
      description: 'Entri berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const cashbookRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

cashbookRoute.use('*', authMiddleware);

cashbookRoute.get('/', requirePermission('cashbook.read'));
cashbookRoute.openapi(listRoute, async (c) => {
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

    return c.json({ success: true, data: data || [] }, 200);
  } catch (err: any) {
    console.error("Cashbook GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil buku kas" } }, 500);
  }
});

cashbookRoute.post('/', requirePermission('cashbook.write'));
cashbookRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const dataObj = c.req.valid('json');

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

    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal menyimpan transaksi kas");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
