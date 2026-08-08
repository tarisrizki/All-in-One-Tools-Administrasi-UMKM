import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { getEnv } from '../utils/env';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

// ---------- Route schemas ----------

const intentSchema = z.object({
  business_id: z.string().uuid(),
  sale_id: z.string().uuid().optional(),
  provider: z.enum(['cash', 'qris', 'transfer', 'ewallet']),
  provider_reference: z.string().optional(),
  amount: z.number().min(0.01).max(10000000),
  status: z.enum(['pending', 'paid', 'failed', 'refunded'])
});

const webhookPayloadSchema = z.object({
  provider: z.string(),
  provider_reference: z.string().optional(),
  amount: z.number().min(0.01).max(10000000),
  currency: z.string().default('IDR'),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  order_id: z.string().optional(),
  created_at: z.string().datetime()
});

const statusSchema = z.object({
  intent_id: z.string().uuid(),
  status: z.string().enum(['pending', 'paid', 'failed', 'refunded']),
  provider_reference: z.string().optional(),
  updated_at: z.string().datetime()
});

const reconcileSchema = z.object({
  intent_id: z.string().uuid(),
  payment_method: z.string().optional(),
  amount: z.number().min(0.01).max(10000000),
  reconciled_at: z.string().datetime()
});

// ---------- Routes ----------

const intentRoute = new OpenAPIHono<{ Bindings: any }>();

intentRoute.use('*', authMiddleware);
intentRoute.get('/', requirePermission('payments.read'));
intentRoute.get('/:id', requirePermission('payments.read'));
intentRoute.post('/', requirePermission('payments.write'));

intentRoute.openapi(intentRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json({ success: true, data: data || [] }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: 'Gagal mengambil payment intents' } }, 500);
  }
});

const createIntentRoute = new OpenAPIHono<{ Bindings: any }>();
createIntentRoute.use('*', authMiddleware);
createIntentRoute.openapi(createIntentRoute, async (c) => {
  const dataObj = c.req.valid('json');
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  // Validate amount
  if (dataObj.amount <= 0 || dataObj.amount > 10000000) {
    return c.json({ success: false, error: { message: 'Amount harus antara 0.01 dan 10.000.000 (rupiah) untuk QRIS' } }, 400);
  }

  // Idempotency: check for existing intent (callback_id-based)
  const { data: existingIntent } = await supabase
    .from('payment_intents')
    .select('id')
    .eq('provider_reference', dataObj.provider_reference)
    .eq('business_id', businessId)
    .limit(1)
    .single();

  // If there's an existing intent with the same reference (idempotent), return it
  if (existingIntent) {
    const { data: intent } = await supabase
      .from('payment_intents')
      .select('status, provider_reference')
      .eq('id', existingIntent.id)
      .single();
    return c.json({ success: true, data: intent }, 200);
  }

  // Insert new intent
  const { data: intent, error: insertErr } = await supabase
    .from('payment_intents')
    .insert({
      business_id: businessId,
      sale_id: dataObj.sale_id || null,
      provider: dataObj.provider,
      provider_reference: dataObj.provider_reference,
      amount: dataObj.amount,
      status: 'pending',
      callback_id: dataObj.provider_reference
    })
    .select()
    .single();

  if (insertErr) {
    return c.json({ success: false, error: { message: 'Gagal membuat payment intent' } }, 500);
  }

  return c.json({ success: true, data: intent }, 201);
});

const webhookRoute = new OpenAPIHono<{ Bindings: any }>();
webhookRoute.use('*', authMiddleware);

webhookRoute.post('/:provider', requirePermission('payments.write'));

webhookRoute.openapi(webhookRoute, async (c) => {
  const businessId = c.get('businessId');
  const provider = c.req.param('provider');
  const payload = c.req.parseBody();

  // Validate payload
  if (!webhookPayloadSchema.safeParse(payload).success) {
    return c.json({ success: false, error: { message: 'Payload webhook tidak valid' } }, 400);
  }

  // Idempotency: check callback_id (duplikat -> 200)
  const { data: existingCallback } = await supabase
    .from('payment_callbacks')
    .select('callback_id')
    .eq('callback_id', payload.provider_reference)
    .limit(1)
    .single();

  if (existingCallback) {
    return c.json({ success: true, message: 'Idempotent callback: duplicate callback_id' }, 200);
  }

  // Update intent status based on webhook payload
  const { error: intentErr } = await supabase
    .from('payment_intents')
    .update({
      status: payload.status,
      provider_reference: provider,
      provider: provider,
      callback_id: payload.provider_reference,
      callback_payload: JSON.stringify(payload),
      updated_at: new Date().toISOString()
    })
    .eq('business_id', businessId)
    .eq('provider_reference', payload.provider_reference);

  // Insert callback record
  const { error: callbackErr } = await supabase
    .from('payment_callbacks')
    .insert({
      callback_id: payload.provider_reference,
      intent_id: null,
      payload: JSON.stringify(payload),
      processed_at: new Date().toISOString()
    });

  if (callbackErr) {
    console.error('Webhook callback save error:', callbackErr);
    return c.json({ success: false, error: { message: 'Gagal menyimpan callback webhook' } }, 500);
  }

  return c.json({ success: true, message: 'Callback webhook tersimpan' }, 200);
});

const statusRoute = new OpenAPIHono<{ Bindings: any }>();
statusRoute.use('*', authMiddleware);
statusRoute.get('/:intent_id', requirePermission('payments.read'));

statusRoute.openapi(statusRoute, async (c) => {
  const intentId = c.req.param('intent_id');
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  const { data, error } = await supabase
    .from('payment_intents')
    .select('id, business_id, sale_id, provider, provider_reference, amount, status, callback_id, created_at, updated_at')
    .eq('id', intentId)
    .eq('business_id', businessId)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: { message: 'Payment intent tidak ditemukan' } }, 404);
  }

  return c.json({ success: true, data: keysToCamel(data) }, 200);
});

const reconcileRoute = new OpenAPIHono<{ Bindings: any }>();
reconcileRoute.use('*', authMiddleware);
reconcileRoute.post('/:id/reconcile', requirePermission('payments.write'));

reconcileRoute.openapi(reconcileRoute, async (c) => {
  const intentId = c.req.param('id');
  const dataObj = c.req.valid('json');
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  // Validate amount
  if (dataObj.amount <= 0 || dataObj.amount > 10000000) {
    return c.json({ success: false, error: { message: 'Amount harus antara 0.01 dan 10.000.000 (rupiah) untuk QRIS' } }, 400);
  }

  const { data, error } = await supabase
    .from('payment_intents')
    .update({
      amount: dataObj.amount,
      status: 'paid',
      provider_reference: dataObj.payment_method || 'transfer',
      callback_id: dataObj.payment_method || null,
      callback_payload: JSON.stringify(dataObj),
      updated_at: new Date().toISOString()
    })
    .eq('id', intentId)
    .eq('business_id', businessId)
    .select();

  if (error) {
    return c.json({ success: false, error: { message: 'Gagal merekonstruksi payment intent' } }, 500);
  }

  return c.json({ success: true, data: keysToCamel(data) }, 200);
});

export { intentRoute, createIntentRoute, webhookRoute, statusRoute, reconcileRoute };