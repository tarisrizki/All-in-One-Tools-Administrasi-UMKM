import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

const openSessionSchema = z.object({
  openingCash: z.number().min(0).openapi({ example: 500000 }),
  notes: z.string().max(500).optional().nullable().openapi({ example: 'Shift pagi' }),
});

const closeSessionSchema = z.object({
  closingCash: z.number().min(0).openapi({ example: 1200000 }),
  notes: z.string().max(500).optional().nullable().openapi({ example: 'Tutup shift' }),
});

const payoutSchema = z.object({
  amount: z.number().min(1).openapi({ example: 50000 }),
  reason: z.string().min(1).max(255).openapi({ example: 'Belanja bahan baku' }),
});

const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
  openedAt: z.string().nullable().optional(),
  openingCash: z.string().nullable().optional(),
  closedAt: z.string().nullable().optional(),
  closingCash: z.string().nullable().optional(),
  expectedCash: z.string().nullable().optional(),
  variance: z.string().nullable().optional(),
  status: z.enum(['open', 'closed']),
  notes: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
}).passthrough();

const payoutResponseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  amount: z.string(),
  reason: z.string(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
}).passthrough();

const reportResponseSchema = z.object({
  sessionId: z.string().uuid(),
  openingCash: z.number(),
  cashSalesTotal: z.number(),
  payoutsTotal: z.number(),
  expectedCash: z.number(),
  closingCash: z.number().nullable().optional(),
  variance: z.number().nullable().optional(),
  salesCount: z.number(),
  status: z.string(),
}).passthrough();

// Routes — spec: POST /pos/sessions (open), GET /pos/sessions (list), POST /pos/sessions/:id/close, GET /:id, POST /:id/payout, GET /:id/report
const listRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'get',
  path: '/',
  description: 'List POS sessions',
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(z.array(sessionResponseSchema)) } }, description: 'Daftar session' },
    401: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Unauthorized' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const openRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'post',
  path: '/',
  description: 'Buka POS session baru',
  request: { body: { content: { 'application/json': { schema: openSessionSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: createSuccessSchema(sessionResponseSchema) } }, description: 'Session dibuka' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid / session masih open' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

// keep legacy /open for backward compat
const openLegacyRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'post',
  path: '/open',
  description: 'Buka POS session (legacy)',
  request: { body: { content: { 'application/json': { schema: openSessionSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: createSuccessSchema(sessionResponseSchema) } }, description: 'Session dibuka' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const closeRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'post',
  path: '/:id/close',
  description: 'Tutup session — hitung expected = opening + cash sales - payouts, variance = closing - expected',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: closeSessionSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(sessionResponseSchema) } }, description: 'Session ditutup' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid / sudah closed' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Session tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const payoutRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'post',
  path: '/:id/payout',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: payoutSchema } } },
  },
  responses: {
    201: { content: { 'application/json': { schema: createSuccessSchema(payoutResponseSchema) } }, description: 'Payout dicatat' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Session tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const detailRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'get',
  path: '/:id',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(sessionResponseSchema) } }, description: 'Detail session' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Session tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const reportRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'get',
  path: '/:id/report',
  description: 'Rekonsiliasi kas per session: opening + cash sales - payouts = expected',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(reportResponseSchema) } }, description: 'Report rekonsiliasi' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Session tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

export const posSessionsRoute = new OpenAPIHono<{ Bindings: any; Variables: { businessId: string; userId: string; roleId: string } }>();

posSessionsRoute.use('*', authMiddleware);

// helpers
async function computeExpected(supabase: any, businessId: string, sessionId: string, openingCash: number) {
  // sales ids bound to session (support both columns)
  const { data: sales } = await supabase.from('sales').select('id').eq('business_id', businessId).or(`pos_session_id.eq.${sessionId},session_id.eq.${sessionId}`);
  const saleIds: string[] = (sales || []).map((s: any) => s.id);
  let cashSalesTotal = 0;
  if (saleIds.length > 0) {
    const { data: pays } = await supabase.from('payments').select('amount,method').in('sale_id', saleIds);
    for (const p of pays || []) {
      const m = String(p.method || '').toLowerCase();
      if (m === 'cash' || m === 'tunai') cashSalesTotal += Number(p.amount || 0);
    }
  }
  let payoutsTotal = 0;
  const { data: payouts } = await supabase.from('pos_payouts').select('amount').eq('session_id', sessionId);
  for (const po of payouts || []) payoutsTotal += Number(po.amount || 0);
  const expectedCash = Number(openingCash || 0) + cashSalesTotal - payoutsTotal;
  return { cashSalesTotal, payoutsTotal, expectedCash, salesCount: saleIds.length };
}

// GET / — list
posSessionsRoute.get('/', requirePermission('pos.read'));
posSessionsRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { data, error } = await supabase.from('pos_sessions').select('*').eq('business_id', businessId).order('opened_at', { ascending: false });
  if (error) return c.json({ success: false, error: { message: error.message } } as any, 500);
  return c.json({ success: true, data: (data || []).map(keysToCamel) } as any, 200);
});

// POST / — open
posSessionsRoute.post('/', requirePermission('pos.write'));
posSessionsRoute.openapi(openRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const body = c.req.valid('json');
  // one open session per business
  const { data: existing } = await supabase.from('pos_sessions').select('id').eq('business_id', businessId).eq('status', 'open').limit(1);
  if (existing && existing.length > 0) return c.json({ success: false, error: { message: 'Masih ada session open' } } as any, 400);
  const { data, error } = await supabase.from('pos_sessions').insert({
    business_id: businessId,
    user_id: userId,
    opening_cash: body.openingCash,
    notes: body.notes || null,
    status: 'open',
    opened_at: new Date().toISOString(),
  }).select().single();
  if (error) return c.json({ success: false, error: { message: error.message } } as any, 500);
  return c.json({ success: true, data: keysToCamel(data) } as any, 201);
});

// POST /open (legacy alias)
posSessionsRoute.post('/open', requirePermission('pos.write'));
posSessionsRoute.openapi(openLegacyRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const { data: existing } = await supabase.from('pos_sessions').select('id').eq('business_id', businessId).eq('status', 'open').limit(1);
  if (existing && existing.length > 0) return c.json({ success: false, error: { message: 'Masih ada session open' } } as any, 400);
  const { data, error } = await supabase.from('pos_sessions').insert({
    business_id: businessId,
    user_id: userId,
    opening_cash: body.openingCash,
    notes: body.notes || null,
    status: 'open',
    opened_at: new Date().toISOString(),
  }).select().single();
  if (error) return c.json({ success: false, error: { message: error.message } } as any, 500);
  return c.json({ success: true, data: keysToCamel(data) } as any, 201);
});

// POST /:id/close
posSessionsRoute.post('/:id/close', requirePermission('pos.write'));
posSessionsRoute.openapi(closeRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const { data: session, error: selErr } = await supabase.from('pos_sessions').select('*').eq('id', id).eq('business_id', businessId).single();
  if (selErr || !session) return c.json({ success: false, error: { message: 'Session tidak ditemukan' } } as any, 404);
  if (session.status === 'closed') return c.json({ success: false, error: { message: 'Session sudah ditutup' } } as any, 400);
  const { cashSalesTotal, payoutsTotal, expectedCash } = await computeExpected(supabase, businessId, id, Number(session.opening_cash || 0));
  // payoutsTotal already inside expected; verify against pos_payouts only (cash sales computed above)
  // expected = opening + cashSales - payouts
  void payoutsTotal; void cashSalesTotal;
  const variance = Number(body.closingCash) - expectedCash;
  const { data, error } = await supabase.from('pos_sessions').update({
    closing_cash: body.closingCash,
    expected_cash: expectedCash,
    variance,
    status: 'closed',
    closed_at: new Date().toISOString(),
    notes: body.notes !== undefined ? body.notes : session.notes,
  }).eq('id', id).select().single();
  if (error) return c.json({ success: false, error: { message: error.message } } as any, 500);
  return c.json({ success: true, data: keysToCamel(data) } as any, 200);
});

// POST /:id/payout
posSessionsRoute.post('/:id/payout', requirePermission('pos.write'));
posSessionsRoute.openapi(payoutRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const { data: session, error: selErr } = await supabase.from('pos_sessions').select('id,status,business_id').eq('id', id).eq('business_id', businessId).single();
  if (selErr || !session) return c.json({ success: false, error: { message: 'Session tidak ditemukan' } } as any, 404);
  if (session.status !== 'open') return c.json({ success: false, error: { message: 'Session tidak bisa payout (bukan status open)' } } as any, 400);
  const { data: payout, error } = await supabase.from('pos_payouts').insert({
    session_id: id,
    amount: body.amount,
    reason: body.reason,
    created_by: c.get('userId'),
  }).select().single();
  if (error) return c.json({ success: false, error: { message: error.message } } as any, 500);
  return c.json({ success: true, data: keysToCamel(payout) } as any, 201);
});

// GET /:id/report — reconciliation
posSessionsRoute.get('/:id/report', requirePermission('pos.read'));
posSessionsRoute.openapi(reportRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  const { data: session, error: selErr } = await supabase.from('pos_sessions').select('*').eq('id', id).eq('business_id', businessId).single();
  if (selErr || !session) return c.json({ success: false, error: { message: 'Session tidak ditemukan' } } as any, 404);
  const { cashSalesTotal, payoutsTotal, expectedCash, salesCount } = await computeExpected(supabase, businessId, id, Number(session.opening_cash || 0));
  const closingCash = session.closing_cash != null ? Number(session.closing_cash) : null;
  const variance = session.variance != null ? Number(session.variance) : (closingCash != null ? closingCash - expectedCash : null);
  return c.json({ success: true, data: {
    sessionId: id,
    openingCash: Number(session.opening_cash || 0),
    cashSalesTotal,
    payoutsTotal,
    expectedCash,
    closingCash,
    variance,
    salesCount,
    status: session.status,
  } } as any, 200);
});

// GET /:id — detail (must be last, after /:id/report)
posSessionsRoute.get('/:id', requirePermission('pos.read'));
posSessionsRoute.openapi(detailRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  const { data, error } = await supabase.from('pos_sessions').select('*').eq('id', id).eq('business_id', businessId).single();
  if (error || !data) return c.json({ success: false, error: { message: 'Session tidak ditemukan' } } as any, 404);
  return c.json({ success: true, data: keysToCamel(data) } as any, 200);
});
