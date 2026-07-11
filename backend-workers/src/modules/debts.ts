import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

const debtSchema = z.object({
  type: z.enum(["hutang", "piutang"]),
  entityName: z.string().min(1, "Nama entitas wajib diisi").max(255),
  entityPhone: z.string().max(30).nullable().optional(),
  amount: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val > 0, "Nominal harus lebih dari 0"),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const paymentSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val > 0, "Nominal pembayaran tidak valid"),
  paymentMethod: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const debtResponseSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  type: z.string(),
  entityName: z.string(),
  entityPhone: z.string().nullable().optional(),
  amount: z.string(),
  remainingAmount: z.string(),
  status: z.string(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

const listRoute = createRoute({
  tags: ['Debts'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar hutang/piutang',
  request: {
    query: z.object({
      type: z.string().optional(),
      status: z.string().optional(),
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(debtResponseSchema)) } },
      description: 'Daftar hutang/piutang',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const createRouteDef = createRoute({
  tags: ['Debts'],
  method: 'post',
  path: '/',
  description: 'Membuat catatan hutang/piutang baru',
  request: {
    body: {
      content: { 'application/json': { schema: debtSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(debtResponseSchema) } },
      description: 'Berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
  },
});

const deleteRoute = createRoute({
  tags: ['Debts'],
  method: 'delete',
  path: '/{id}',
  description: 'Menghapus hutang/piutang',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Berhasil dihapus',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const remindRoute = createRoute({
  tags: ['Debts'],
  method: 'post',
  path: '/{id}/remind',
  description: 'Mengirimkan pesan pengingat WA',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Berhasil',
    },
  },
});

const getByIdRoute = createRoute({
  tags: ['Debts'],
  method: 'get',
  path: '/{id}',
  description: 'Mendapatkan detail hutang/piutang',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(debtResponseSchema) } },
      description: 'Detail',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const payRoute = createRoute({
  tags: ['Debts'],
  method: 'post',
  path: '/{id}/payments',
  description: 'Membayar cicilan hutang/piutang',
  request: {
    params: z.object({
      id: z.string().uuid()
    }),
    body: {
      content: { 'application/json': { schema: paymentSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(debtResponseSchema) } },
      description: 'Pembayaran berhasil',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Tidak ditemukan',
    },
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const debtsRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

debtsRoute.use('*', authMiddleware);

debtsRoute.get('/', requirePermission('debts.manage'));
debtsRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { type, status } = c.req.valid('query');

  try {
    let query = supabase.from('debts').select('*').eq('business_id', businessId);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data || []) }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data hutang/piutang" } }, 500);
  }
});

debtsRoute.post('/', requirePermission('debts.manage'));
debtsRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const dataObj = c.req.valid('json');

    const { data, error } = await supabase
      .from('debts')
      .insert({
        business_id: businessId,
        type: dataObj.type,
        entity_name: dataObj.entityName,
        entity_phone: dataObj.entityPhone || null,
        amount: dataObj.amount.toString(),
        remaining_amount: dataObj.amount.toString(),
        due_date: dataObj.dueDate ? new Date(dataObj.dueDate).toISOString() : null,
        notes: dataObj.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data) }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menyimpan hutang/piutang" } }, 400);
  }
});

debtsRoute.delete('/:id', requirePermission('debts.manage'));
debtsRoute.openapi(deleteRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const { data: debtRes } = await supabase.from('debts').select('id').eq('id', id).eq('business_id', businessId).single();
    if (!debtRes) return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);

    await supabase.from('debt_payments').delete().eq('debt_id', id);
    await supabase.from('debts').delete().eq('id', id).eq('business_id', businessId);

    return c.json({ success: true, message: "Hutang/Piutang berhasil dihapus" }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghapus hutang/piutang" } }, 500);
  }
});

debtsRoute.post('/:id/remind', requirePermission('debts.manage'));
debtsRoute.openapi(remindRoute, async (c) => {
  return c.json({ success: true, message: "Pengingat WA berhasil dikirim (simulasi)" }, 200);
});

debtsRoute.get('/:id', requirePermission('debts.manage'));
debtsRoute.openapi(getByIdRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const { data: debt, error } = await supabase.from('debts').select('*').eq('id', id).eq('business_id', businessId).single();
    if (error || !debt) return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);

    const { data: payments } = await supabase.from('debt_payments').select('*').eq('debt_id', id).order('payment_date', { ascending: false });

    return c.json({ success: true, data: keysToCamel({ ...debt, payments: payments || [] }) }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data hutang/piutang" } }, 500);
  }
});

debtsRoute.post('/:id/payments', requirePermission('debts.manage'));
debtsRoute.openapi(payRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const { id } = c.req.valid('param');

  try {
    const { amount, paymentMethod, notes } = c.req.valid('json');

    const { data: debt } = await supabase.from('debts').select('*').eq('id', id).eq('business_id', businessId).single();
    if (!debt) return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);

    const currentRemaining = parseFloat(debt.remaining_amount);
    const currentAmount = parseFloat(debt.amount);

    if (debt.status === "paid" || currentRemaining <= 0) {
      return c.json({ success: false, error: { message: "Tagihan sudah lunas" } }, 400);
    }

    let paymentAmount = amount;
    if (paymentAmount > currentRemaining) paymentAmount = currentRemaining;
    const newRemaining = currentRemaining - paymentAmount;
    let newStatus = debt.status;

    if (newRemaining <= 0) newStatus = "paid";
    else if (newRemaining < currentAmount) newStatus = "partial";

    await supabase.from('debt_payments').insert({
      debt_id: id,
      amount: paymentAmount.toString(),
      payment_method: paymentMethod || "cash",
      notes: notes || null,
      created_by: userId,
    });

    const { data: updatedDebt } = await supabase
      .from('debts')
      .update({ remaining_amount: newRemaining.toString(), status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return c.json({ success: true, data: keysToCamel(updatedDebt) }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menyimpan pembayaran" } }, 400);
  }
});
