import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { getEnv } from '../utils/env';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

// ---------- Route schemas ----------

type Variables = { businessId: string; userId: string; roleId: string };

const intentSchema = z.object({
  business_id: z.string().uuid(),
  sale_id: z.string().uuid().optional(),
  provider: z.enum(['cash', 'qris', 'transfer', 'ewallet']),
  provider_reference: z.string().optional(),
  amount: z.number().min(0.01).max(10000000),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional().default('pending')
});

const webhookPayloadSchema = z.object({
  callback_id: z.string().min(1, 'callback_id required'),
  provider: z.string().optional(),
  provider_reference: z.string().optional(),
  amount: z.number().min(0.01).max(10000000).optional(),
  currency: z.string().default('IDR'),
  status: z.enum(['pending', 'paid', 'failed', 'refunded', 'refund']).default('paid'),
  order_id: z.string().optional(),
  created_at: z.string().optional(),
});

// ---------- Route configs ----------

const listRouteDef = createRoute({
  tags: ['Payments'],
  method: 'get',
  path: '/',
  description: 'List payment intents',
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(z.array(z.object({}))) } }, description: 'Daftar intent' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const createIntentRouteDef = createRoute({
  tags: ['Payments'],
  method: 'post',
  path: '/',
  description: 'Create payment intent',
  request: { body: { content: { 'application/json': { schema: intentSchema } } } },
  responses: {
      200: { content: { 'application/json': { schema: createSuccessSchema(z.object({})) } }, description: 'Intent dibuat' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
    },
  });

const webhookRouteDef = createRoute({
  tags: ['Payments'],
  method: 'post',
  path: '/:provider',
  description: 'Provider webhook callback (idempotent by callback_id) — public, tanpa auth',
  request: {
    params: z.object({ provider: z.string() }),
    body: { content: { 'application/json': { schema: webhookPayloadSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: MessageSuccessSchema } }, description: 'Callback diterima' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Payload tidak valid' },
    401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Signature tidak valid' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Intent tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const getIntentRoute = createRoute({
  tags: ['Payments'],
  method: 'get',
  path: '/:id',
  description: 'Get payment intent status',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(z.object({})) } }, description: 'Status intent' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Intent tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const statusRouteDef = getIntentRoute;

const reconcileRouteDef = createRoute({
  tags: ['Payments'],
  method: 'post',
  path: '/:id/reconcile',
  description: 'Reconcile payment intent manually',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({
      amount: z.number().min(0.01).max(10000000),
      payment_method: z.string().optional(),
      status: z.enum(['pending', 'paid', 'failed', 'refunded', 'refund']).optional(),
      reconciled_at: z.string().datetime().optional(),
    }) } } },
  },
  responses: {
      200: { content: { 'application/json': { schema: createSuccessSchema(z.object({})) } }, description: 'Intent direkonsiliasi' },
      400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid' },
      404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Intent tidak ditemukan' },
      500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
    },
  });

const paymentsRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

paymentsRoute.use('*', authMiddleware);

paymentsRoute.get('/', requirePermission('payments.read'));
paymentsRoute.openapi(listRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ success: true, data: data || [] }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: 'Gagal mengambil payment intents' } }, 500);
  }
});

paymentsRoute.post('/', requirePermission('payments.write'));
paymentsRoute.openapi(createIntentRouteDef, async (c) => {
  const dataObj = c.req.valid('json');
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  if (dataObj.amount <= 0 || dataObj.amount > 10000000) {
    return c.json({ success: false, error: { message: 'Amount harus antara 0.01 dan 10.000.000 (rupiah) untuk QRIS' } }, 400);
  }

  // Idempotency: provider_reference unik per bisnis (jika provided)
  if (dataObj.provider_reference) {
    const { data: existingIntent } = await supabase
      .from('payment_intents')
      .select('id')
      .eq('provider_reference', dataObj.provider_reference)
      .eq('business_id', businessId)
      .limit(1)
      .maybeSingle();

    if (existingIntent) {
      const { data: intent } = await supabase
        .from('payment_intents')
        .select('status, provider_reference, callback_id')
        .eq('id', existingIntent.id)
        .single();
      if (intent) return c.json({ success: true, data: intent }, 200);
    }
  }

  const { data: intent, error: insertErr } = await supabase
      .from('payment_intents')
      .insert({
        business_id: businessId,
        sale_id: dataObj.sale_id || null,
        provider: dataObj.provider,
        provider_reference: dataObj.provider_reference || null,
        amount: dataObj.amount,
        status: 'pending',
        callback_id: dataObj.provider_reference || null,
      })
      .select()
      .single();

  if (insertErr || !intent) {
    // unique violation -> idempotent return existing
    if ((insertErr as any)?.code === '23505') {
      const { data: dup } = await supabase
        .from('payment_intents')
        .select('status, provider_reference, callback_id')
        .eq('provider_reference', dataObj.provider_reference!)
        .eq('business_id', businessId)
        .maybeSingle();
      if (dup) return c.json({ success: true, data: dup }, 200);
    }
    return c.json({ success: false, error: { message: insertErr?.message || 'Gagal membuat intent' } }, 500);
  }

  return c.json({ success: true, data: intent }, 200);
});

// Webhook — publik (tanpa auth), idempotent by callback_id
const webhookRoute = new OpenAPIHono<{ Bindings: any }>();

webhookRoute.openapi(webhookRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const provider = c.req.valid('param').provider;
  const payload = c.req.valid('json');

  // PSP secret validation (optional — aktif jika env diset)
  const pspSecret = getEnv(c, 'PSP_WEBHOOK_SECRET') || getEnv(c, 'QRIS_PROVIDER_SECRET') || getEnv(c, 'MIDTRANS_SERVER_KEY');
  if (pspSecret) {
    const sig = c.req.header('x-psp-signature') || c.req.header('x-webhook-secret') || c.req.header('x-callback-token') || '';
    if (!sig || sig !== pspSecret) {
      return c.json({ success: false, error: { message: 'Invalid webhook signature' } }, 401);
    }
  }

  // callback_id required sudah divalidasi zod; guard extra
  if (!payload.callback_id) {
    return c.json({ success: false, error: { message: 'callback_id required' } }, 400);
  }

  // Idempotency: callback_id duplikat -> 200 tanpa double process
  const { data: existingCallback } = await supabase
    .from('payment_callbacks')
    .select('callback_id')
    .eq('callback_id', payload.callback_id)
    .limit(1)
    .maybeSingle();

  if (existingCallback) {
    return c.json({ success: true, message: 'Idempotent callback: duplicate callback_id' }, 200);
  }

  // Lookup intent: provider_reference / order_id / callback_id
  const lookupRef = payload.provider_reference || payload.order_id || payload.callback_id;
  let intentId: string | null = null;
  let intentAmount: number | null = null;
  if (lookupRef) {
    // coba provider_reference dulu, fallback callback_id
    const { data: byRef } = await supabase
      .from('payment_intents')
      .select('id, amount')
      .eq('provider_reference', lookupRef)
      .limit(1)
      .maybeSingle();
    if (byRef) {
      intentId = byRef.id;
      intentAmount = Number(byRef.amount);
    } else {
      const { data: byCb } = await supabase
        .from('payment_intents')
        .select('id, amount')
        .eq('callback_id', lookupRef)
        .limit(1)
        .maybeSingle();
      if (byCb) {
        intentId = byCb.id;
        intentAmount = Number(byCb.amount);
      }
    }
  }

  if (!intentId) {
    return c.json({ success: false, error: { message: 'Payment intent tidak ditemukan untuk callback' } }, 404);
  }

  // Reconciliation: amount mismatch -> log tapi tetap proses (jangan reject paid yang valid)
  if (payload.amount != null && intentAmount != null && Number(payload.amount) !== intentAmount) {
    console.warn(`Webhook amount mismatch: intent ${intentId} amount ${intentAmount} vs callback ${payload.amount}`);
  }

  const normalizedStatus = payload.status === 'refund' ? 'refunded' : payload.status;

  // Simpan callback record dulu (idempotency ledger) — handle race via PK violation
  const { error: callbackErr } = await supabase
    .from('payment_callbacks')
    .insert({
      callback_id: payload.callback_id,
      intent_id: intentId,
      payload: payload as any,
      processed_at: new Date().toISOString(),
    });

  if (callbackErr) {
    // 23505 = duplicate callback_id race -> idempotent
    if ((callbackErr as any).code === '23505' || String(callbackErr.message).includes('duplicate')) {
      return c.json({ success: true, message: 'Idempotent callback: duplicate callback_id' }, 200);
    }
    console.error('Webhook callback save error:', callbackErr);
    return c.json({ success: false, error: { message: 'Gagal menyimpan callback webhook' } }, 500);
  }

  // Update intent status berdasarkan webhook payload
  const { error: intentErr } = await supabase
    .from('payment_intents')
    .update({
      status: normalizedStatus,
      provider: provider,
      callback_id: payload.callback_id,
      callback_payload: payload as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', intentId);

  if (intentErr) return c.json({ success: false, error: { message: 'Gagal memperbarui intent' } }, 500);

  return c.json({ success: true, message: 'Callback webhook tersimpan' }, 200);
});

paymentsRoute.get('/:id', requirePermission('payments.read'));
paymentsRoute.openapi(statusRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  const { data, error } = await supabase
    .from('payment_intents')
    .select('id, business_id, sale_id, provider, provider_reference, amount, status, callback_id, created_at, updated_at')
    .eq('id', id)
    .eq('business_id', businessId)
    .single();

  if (error || !data) return c.json({ success: false, error: { message: 'Payment intent tidak ditemukan' } }, 404);
  return c.json({ success: true, data: keysToCamel(data) }, 200);
});

paymentsRoute.post('/:id/reconcile', requirePermission('payments.write'));
paymentsRoute.openapi(reconcileRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  const dataObj = c.req.valid('json');

  if (dataObj.amount <= 0 || dataObj.amount > 10000000) {
      return c.json({ success: false, error: { message: 'Amount harus antara 0.01 dan 10.000.000 (rupiah) untuk QRIS' } }, 400);
    }

    const targetStatus = (dataObj.status === 'refund' ? 'refunded' : (dataObj.status || 'paid')) as string;

    const { data, error } = await supabase
      .from('payment_intents')
      .update({
        amount: dataObj.amount,
        status: targetStatus,
        callback_payload: dataObj as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error || !data || (Array.isArray(data) && data.length === 0)) return c.json({ success: false, error: { message: 'Gagal merekonstilisasi payment intent' } }, 404);
    return c.json({ success: true, data: keysToCamel(data) }, 200);
  });

export { paymentsRoute, webhookRoute };
