import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1),
  price: z.number().min(0).optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
});

const orderCreateSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway', 'delivery', 'preorder']).default('dine_in'),
  diningTableId: z.string().uuid().optional().nullable(),
  tableNumber: z.string().max(50).optional().nullable(),
  outletId: z.string().uuid().optional().nullable(),
  sessionId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().max(255).optional().nullable(),
  customerPhone: z.string().max(30).optional().nullable(),
  serviceFee: z.number().min(0).default(0),
  deposit: z.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(orderItemInputSchema).min(1).max(200),
});

const orderResponseSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid().nullable().optional(),
  outletId: z.string().uuid().nullable().optional(),
  diningTableId: z.string().uuid().nullable().optional(),
  tableNumber: z.string().nullable().optional(),
  queueNumber: z.number().nullable().optional(),
  orderType: z.string(),
  status: z.string(),
  serviceFee: z.string().nullable().optional(),
  deposit: z.string().nullable().optional(),
  subtotal: z.string().nullable().optional(),
  grandTotal: z.string().nullable().optional(),
  queueLength: z.number().optional(),
  prepTime: z.number().optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  saleId: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
}).passthrough();

const kdsItemSchema = orderResponseSchema.extend({
  items: z.array(z.any()).optional(),
}).passthrough();

const listRoute = createRoute({
  tags: ['Orders'],
  method: 'get',
  path: '/',
  description: 'List orders (enriched queue_length + prep_time)',
  request: { query: z.object({ status: z.string().optional(), orderType: z.string().optional(), page: z.string().optional(), limit: z.string().optional() }) },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(z.array(orderResponseSchema)) } }, description: 'Daftar orders' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Bad request' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const kdsRoute = createRoute({
  tags: ['Orders'],
  method: 'get',
  path: '/kds',
  description: 'KDS queue — queue_length + prep_time 15min/item',
  request: { query: z.object({ status: z.string().optional() }) },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(z.array(kdsItemSchema)) } }, description: 'KDS queue' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const createRouteDef = createRoute({
  tags: ['Orders'],
  method: 'post',
  path: '/',
  description: 'Create order — assign queue_number, subtotal/grand_total',
  request: { body: { content: { 'application/json': { schema: orderCreateSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: createSuccessSchema(orderResponseSchema) } }, description: 'Order dibuat' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid input' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const detailRoute = createRoute({
  tags: ['Orders'],
  method: 'get',
  path: '/{id}',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(kdsItemSchema) } }, description: 'Detail order + prep_time' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const statusRoute = createRoute({
  tags: ['Orders'],
  method: 'post',
  path: '/{id}/status',
  description: 'Transition draft->confirmed->preparing->ready->served->completed + cancel any',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({ status: z.enum(['draft', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled']) }) } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(orderResponseSchema) } }, description: 'Status updated' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid transition' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const cancelRoute = createRoute({
  tags: ['Orders'],
  method: 'post',
  path: '/{id}/cancel',
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { 'application/json': { schema: z.object({ reason: z.string().max(500).optional().nullable() }) } } } },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(orderResponseSchema) } }, description: 'Cancelled' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const convertRoute = createRoute({
  tags: ['Orders'],
  method: 'post',
  path: '/{id}/convert',
  description: 'Atomic convert_order_to_sale RPC (potong stok sekali)',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({ warehouseId: z.string().uuid().optional().nullable(), payments: z.array(z.object({ method: z.string(), amount: z.number().min(0) })).max(10).optional().nullable() }) } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(z.any()) } }, description: 'Converted (idempotent)' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Invalid / already cancelled' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const ordersRoute = new OpenAPIHono<{ Bindings: any; Variables: Variables }>();

ordersRoute.use('*', authMiddleware);

// ponytail: prep_time ceiling 15min/item fixed; upgrade per-product prep_time column when menu complexity varies
function prepTimeMinutes(totalQty: number): number {
  return totalQty * 15;
}

const ALLOWED_NEXT: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function canTransition(from: string, to: string): boolean {
  if (to === 'cancelled') return from !== 'completed' && from !== 'cancelled';
  return (ALLOWED_NEXT[from] || []).includes(to);
}

async function nextQueueNumber(supabase: any, businessId: string): Promise<number> {
  // prefer RPC, fallback max+1 today
  try {
    const { data, error } = await supabase.rpc('next_queue_number', { p_business_id: businessId });
    if (!error && typeof data === 'number') return data;
  } catch {}
  const { data } = await supabase.from('orders').select('queue_number').eq('business_id', businessId).order('queue_number', { ascending: false }).limit(1);
  const max = (data && data[0]?.queue_number) ? Number(data[0].queue_number) : 0;
  return max + 1;
}

ordersRoute.get('/', requirePermission('orders.read'));
ordersRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { status, orderType, page, limit } = c.req.valid('query');
  const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 200);
  const offset = (pageNum - 1) * limitNum;
  try {
    let q = supabase.from('orders').select('*', { count: 'exact' }).eq('business_id', businessId);
    if (status) q = q.eq('status', status);
    if (orderType) q = q.eq('order_type', orderType);
    const { data, error, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);
    if (error) throw error;
    // queue_length = active KDS queue size
    const { count: activeCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('business_id', businessId).in('status', ['confirmed', 'preparing', 'ready', 'served']);
    const queueLength = activeCount || 0;
    // lightweight prep_time: need items qty per order — batch fetch
    const ids: string[] = (data || []).map((o: any) => o.id);
    let qtyMap: Record<string, number> = {};
    if (ids.length) {
      const { data: items } = await supabase.from('order_items').select('order_id,qty').in('order_id', ids);
      for (const it of items || []) qtyMap[it.order_id] = (qtyMap[it.order_id] || 0) + Number(it.qty || 0);
    }
    const enriched = (data || []).map((o: any) => {
      const base = keysToCamel(o);
      return { ...base, queueLength, prepTime: prepTimeMinutes(qtyMap[o.id] || 0) };
    });
    return c.json({ success: true, data: enriched, pagination: { page: pageNum, limit: limitNum, total: count || 0 } } as any, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal mengambil orders' } } as any, 500);
  }
});

ordersRoute.get('/kds', requirePermission('orders.read'));
ordersRoute.openapi(kdsRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const statusQ = c.req.valid('query').status;
  try {
    const targetStatuses = statusQ ? [statusQ] : ['confirmed', 'preparing', 'ready', 'served'];
    const { data: orders, error } = await supabase.from('orders').select('*').eq('business_id', businessId).in('status', targetStatuses).order('queue_number', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
    if (error) throw error;
    const queueLength = (orders || []).length;
    const ids: string[] = (orders || []).map((o: any) => o.id);
    let itemsMap: Record<string, any[]> = {};
    let qtyMap: Record<string, number> = {};
    if (ids.length) {
      const { data: items } = await supabase.from('order_items').select('*').in('order_id', ids);
      for (const it of items || []) {
        if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
        itemsMap[it.order_id].push(keysToCamel(it));
        qtyMap[it.order_id] = (qtyMap[it.order_id] || 0) + Number(it.qty || 0);
      }
    }
    const enriched = (orders || []).map((o: any, idx: number) => {
      const base = keysToCamel(o);
      const totalQty = qtyMap[o.id] || 0;
      return { ...base, queueLength, queuePosition: idx + 1, prepTime: prepTimeMinutes(totalQty), items: itemsMap[o.id] || [] };
    });
    return c.json({ success: true, data: enriched } as any, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal mengambil KDS' } } as any, 500);
  }
});

ordersRoute.post('/', requirePermission('orders.write'));
ordersRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const body = c.req.valid('json');
  try {
    const qn = await nextQueueNumber(supabase, businessId);
    // subtotal from items (price fallback 0, server trusts item price for now; sales flow verifies from DB)
    let subtotal = 0;
    for (const it of body.items) subtotal += Number(it.price || 0) * it.qty - Number(it.discount || 0) * it.qty;
    const grandTotal = subtotal + Number(body.serviceFee || 0);
    const { data: order, error } = await supabase.from('orders').insert({
      business_id: businessId,
      outlet_id: body.outletId || null,
      dining_table_id: body.diningTableId || null,
      table_number: body.tableNumber || null,
      session_id: body.sessionId || null,
      queue_number: qn,
      order_type: body.orderType,
      status: 'draft',
      service_fee: body.serviceFee || 0,
      deposit: body.deposit || 0,
      subtotal,
      grand_total: grandTotal,
      customer_id: body.customerId || null,
      customer_name: body.customerName || null,
      customer_phone: body.customerPhone || null,
      notes: body.notes || null,
      created_by: userId,
    }).select().single();
    if (error) throw error;
    const orderItems = body.items.map((it: any) => ({
      order_id: order.id,
      product_id: it.productId,
      qty: it.qty,
      price: it.price ?? 0,
      discount: it.discount ?? 0,
      notes: it.notes || null,
    }));
    const { error: itemErr } = await supabase.from('order_items').insert(orderItems);
    if (itemErr) throw itemErr;
    await supabase.from('order_status_history').insert({ order_id: order.id, old_status: null, new_status: 'draft', changed_by: userId });
    // kitchen ticket minimal
    const ticketNumber = `KT-${String(qn).padStart(4, '0')}-${order.id.slice(0, 6)}`;
    await supabase.from('kitchen_tickets').insert({
      business_id: businessId,
      order_id: order.id,
      ticket_number: ticketNumber,
      status: 'pending',
      items_snapshot: body.items,
      is_sent: true,
    });
    if (body.diningTableId) {
      await supabase.from('dining_tables').update({ is_occupied: true, updated_at: new Date().toISOString() }).eq('id', body.diningTableId).eq('business_id', businessId);
    }
    const prepTime = prepTimeMinutes(body.items.reduce((s: number, it: any) => s + it.qty, 0));
    const { count: qLen } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('business_id', businessId).in('status', ['confirmed', 'preparing', 'ready', 'served']);
    return c.json({ success: true, data: { ...keysToCamel(order), queueLength: qLen || 0, prepTime } } as any, 201);
  } catch (err: any) {
    const msg = err.message || 'Gagal membuat order';
    const isValidation = err.issues != null;
    return c.json({ success: false, error: { message: isValidation ? 'Input tidak valid' : msg } } as any, isValidation ? 400 : 500);
  }
});

ordersRoute.get('/:id', requirePermission('orders.read'));
ordersRoute.openapi(detailRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');
  try {
    const { data: order, error } = await supabase.from('orders').select('*').eq('id', id).eq('business_id', businessId).single();
    if (error || !order) return c.json({ success: false, error: { message: 'Order tidak ditemukan' } } as any, 404);
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id);
    const totalQty = (items || []).reduce((s: number, it: any) => s + Number(it.qty || 0), 0);
    const { count: qLen } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('business_id', businessId).in('status', ['confirmed', 'preparing', 'ready', 'served']);
    // queue_position: rank by queue_number among active
    let queuePosition: number | null = null;
    if (order.queue_number != null) {
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('business_id', businessId).in('status', ['confirmed', 'preparing', 'ready', 'served']).lte('queue_number', order.queue_number);
      queuePosition = count || 1;
    }
    return c.json({ success: true, data: { ...keysToCamel(order), items: (items || []).map(keysToCamel), prepTime: prepTimeMinutes(totalQty), queueLength: qLen || 0, queuePosition } } as any, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal mengambil order' } } as any, 500);
  }
});

ordersRoute.patch('/:id/status', requirePermission('orders.write'));
ordersRoute.openapi(statusRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const { status: nextStatus } = c.req.valid('json');
  try {
    const { data: order, error } = await supabase.from('orders').select('*').eq('id', id).eq('business_id', businessId).single();
    if (error || !order) return c.json({ success: false, error: { message: 'Order tidak ditemukan' } } as any, 404);
    const cur = String(order.status);
    if (!canTransition(cur, nextStatus)) {
      return c.json({ success: false, error: { message: `Transisi ${cur} -> ${nextStatus} tidak diizinkan` } } as any, 400);
    }
    const { data: updated, error: updErr } = await supabase.from('orders').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', id).eq('business_id', businessId).select().single();
    if (updErr) throw updErr;
    await supabase.from('order_status_history').insert({ order_id: id, old_status: cur, new_status: nextStatus, changed_by: userId });
    // sync kitchen ticket status
    const ticketMap: Record<string, string> = { confirmed: 'printed', preparing: 'preparing', ready: 'ready', served: 'served', completed: 'served', cancelled: 'cancelled' };
    const ticketStatus = ticketMap[nextStatus];
    if (ticketStatus) {
      await supabase.from('kitchen_tickets').update({ status: ticketStatus, updated_at: new Date().toISOString() }).eq('order_id', id);
    }
    if (nextStatus === 'completed' || nextStatus === 'cancelled') {
      if (order.dining_table_id) {
        await supabase.from('dining_tables').update({ is_occupied: false, updated_at: new Date().toISOString() }).eq('id', order.dining_table_id);
      }
    }
    return c.json({ success: true, data: keysToCamel(updated) } as any, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal update status' } } as any, 500);
  }
});

ordersRoute.post('/:id/cancel', requirePermission('orders.write'));
ordersRoute.openapi(cancelRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  try {
    const { data: order, error } = await supabase.from('orders').select('*').eq('id', id).eq('business_id', businessId).single();
    if (error || !order) return c.json({ success: false, error: { message: 'Order tidak ditemukan' } } as any, 404);
    const cur = String(order.status);
    if (!canTransition(cur, 'cancelled')) {
      return c.json({ success: false, error: { message: `Order status ${cur} tidak bisa dibatalkan` } } as any, 400);
    }
    const { data: updated, error: updErr } = await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('business_id', businessId).select().single();
    if (updErr) throw updErr;
    await supabase.from('order_status_history').insert({ order_id: id, old_status: cur, new_status: 'cancelled', changed_by: userId });
    await supabase.from('kitchen_tickets').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('order_id', id);
    if (order.dining_table_id) {
      await supabase.from('dining_tables').update({ is_occupied: false, updated_at: new Date().toISOString() }).eq('id', order.dining_table_id);
    }
    return c.json({ success: true, data: keysToCamel(updated) } as any, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal cancel' } } as any, 500);
  }
});

ordersRoute.post('/:id/convert', requirePermission('orders.write'));
ordersRoute.openapi(convertRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json') as any;
  try {
    // atomic RPC — potong stok sekali via process_sale di dalam convert_order_to_sale
    const { data, error } = await supabase.rpc('convert_order_to_sale', {
      p_order_id: id,
      p_business_id: businessId,
      p_created_by: userId,
      p_warehouse_id: body.warehouseId || null,
      p_payments: body.payments ? JSON.stringify(body.payments) as any : null,
    });
    // supabase-js sends jsonb as object; stringify fallback above covers both
    // retry with object form if string path fails with type error
    let result = data;
    let rpcErr: any = error;
    if (rpcErr && String(rpcErr.message).includes('json')) {
      const { data: d2, error: e2 } = await supabase.rpc('convert_order_to_sale', {
        p_order_id: id,
        p_business_id: businessId,
        p_created_by: userId,
        p_warehouse_id: body.warehouseId || null,
        p_payments: body.payments || [],
      });
      result = d2;
      rpcErr = e2;
    }
    if (rpcErr) {
      const msg = String(rpcErr.message || '');
      if (msg.includes('tidak ditemukan')) return c.json({ success: false, error: { message: msg } } as any, 404);
      if (msg.includes('dibatalkan') || msg.includes('cancel')) return c.json({ success: false, error: { message: msg } } as any, 400);
      throw rpcErr;
    }
    return c.json({ success: true, data: result ? keysToCamel(result) : result } as any, 200);
  } catch (err: any) {
    const msg = err.message || 'Gagal convert order';
    if (msg.includes('tidak ditemukan')) return c.json({ success: false, error: { message: msg } } as any, 404);
    return c.json({ success: false, error: { message: msg } } as any, 500);
  }
});

// self-check (one runnable assert) — skipped: add when prep_time per-product varies
