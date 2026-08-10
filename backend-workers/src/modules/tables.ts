import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

// ponytail: in-memory per-business via KV (RATE_LIMIT_KV) atau Map fallback. Upgrade: tabel Supabase saat skala.

const tableRespSchema = z.object({
  id: z.string(),
  outletId: z.string().optional(),
  outlet_id: z.string().optional(),
  number: z.string().optional(),
  name: z.string().optional(),
  capacity: z.number().optional(),
  area: z.string().optional(),
  status: z.string().optional(),
  currentOrderId: z.string().nullable().optional(),
}).passthrough();

const tableCreateSchema = z.object({
  number: z.string().optional(),
  name: z.string().optional(),
  outletId: z.string().optional(),
  outlet_id: z.string().optional(),
  capacity: z.number().optional(),
  area: z.string().optional(),
  status: z.string().optional(),
});

type Vars = { businessId: string; userId: string; roleId: string };
export const tablesRoute = new OpenAPIHono<{ Bindings: any; Variables: Vars }>();
tablesRoute.use('*', authMiddleware);

const mem = new Map<string, any[]>();

async function load(c: any): Promise<any[]> {
  const bid = c.get('businessId') as string;
  const kv = (c.env as any)?.RATE_LIMIT_KV;
  if (kv) {
    try {
      const raw = await kv.get(`tables:${bid}`);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return mem.get(bid) || [];
}

async function save(c: any, list: any[]) {
  const bid = c.get('businessId') as string;
  mem.set(bid, list);
  const kv = (c.env as any)?.RATE_LIMIT_KV;
  if (kv) {
    try { await kv.put(`tables:${bid}`, JSON.stringify(list)); } catch {}
  }
}

const listRoute = createRoute({
  tags: ['Tables'], method: 'get', path: '/',
  request: { query: z.object({ outletId: z.string().optional(), outlet_id: z.string().optional() }) },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(z.array(tableRespSchema)) } }, description: 'Daftar meja' } },
});

const getRoute = createRoute({
  tags: ['Tables'], method: 'get', path: '/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(tableRespSchema) } }, description: 'OK' }, 404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' } },
});

const createRouteDef = createRoute({
  tags: ['Tables'], method: 'post', path: '/',
  request: { body: { content: { 'application/json': { schema: tableCreateSchema } } } },
  responses: { 201: { content: { 'application/json': { schema: createSuccessSchema(tableRespSchema) } }, description: 'Created' } },
});

const putRouteDef = createRoute({
  tags: ['Tables'], method: 'put', path: '/{id}',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: tableCreateSchema } } } },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(tableRespSchema) } }, description: 'Updated' } },
});

const deleteRouteDef = createRoute({
  tags: ['Tables'], method: 'delete', path: '/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(z.object({ id: z.string() })) } }, description: 'Deleted' }, 404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' } },
});

const patchStatusRoute = createRoute({
  tags: ['Tables'], method: 'patch', path: '/{id}/status',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ status: z.string(), currentOrderId: z.string().nullable().optional() }) } } } },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(tableRespSchema) } }, description: 'Updated' } },
});

function normalize(input: any): any {
  const id = input.id ?? crypto.randomUUID();
  return {
    id,
    outletId: input.outletId ?? input.outlet_id ?? '',
    outlet_id: input.outletId ?? input.outlet_id ?? '',
    number: input.number ?? input.name ?? id,
    name: input.number ?? input.name ?? id,
    capacity: input.capacity ?? 4,
    area: input.area ?? 'Indoor',
    status: input.status ?? 'empty',
    currentOrderId: input.currentOrderId ?? input.current_order_id ?? null,
    current_order_id: input.currentOrderId ?? input.current_order_id ?? null,
  };
}

// @ts-ignore
tablesRoute.openapi(listRoute, async (c) => {
  const list = await load(c);
  const q = c.req.query();
  const outletId = (q as any).outletId || (q as any).outlet_id;
  const filtered = outletId ? list.filter((t: any) => (t.outletId === outletId || t.outlet_id === outletId)) : list;
  return c.json({ success: true, data: filtered }, 200);
});

// @ts-ignore
tablesRoute.openapi(getRoute, async (c) => {
  const { id } = c.req.valid('param') as any;
  const list = await load(c);
  const found = list.find((t: any) => t.id === id);
  if (!found) return c.json({ success: false, error: { message: 'Meja tidak ditemukan' } }, 404);
  return c.json({ success: true, data: found }, 200);
});

// @ts-ignore
tablesRoute.openapi(createRouteDef, async (c) => {
  const body = c.req.valid('json') as any;
  const row = normalize(body);
  const list = await load(c);
  list.push(row);
  await save(c, list);
  return c.json({ success: true, data: row }, 201);
});

// @ts-ignore
tablesRoute.openapi(putRouteDef, async (c) => {
  const { id } = c.req.valid('param') as any;
  const body = c.req.valid('json') as any;
  const list = await load(c);
  const idx = list.findIndex((t: any) => t.id === id);
  if (idx < 0) return c.json({ success: false, error: { message: 'Meja tidak ditemukan' } }, 404);
  const merged = { ...list[idx], ...body, id };
  list[idx] = merged;
  await save(c, list);
  return c.json({ success: true, data: merged }, 200);
});

// @ts-ignore
tablesRoute.openapi(deleteRouteDef, async (c) => {
  const { id } = c.req.valid('param') as any;
  const list = await load(c);
  const next = list.filter((t: any) => t.id !== id);
  if (next.length === list.length) return c.json({ success: false, error: { message: 'Meja tidak ditemukan' } }, 404);
  await save(c, next);
  return c.json({ success: true, data: { id } }, 200);
});

// @ts-ignore
tablesRoute.openapi(patchStatusRoute, async (c) => {
  const { id } = c.req.valid('param') as any;
  const body = c.req.valid('json') as any;
  const list = await load(c);
  const idx = list.findIndex((t: any) => t.id === id);
  if (idx < 0) return c.json({ success: false, error: { message: 'Meja tidak ditemukan' } }, 404);
  list[idx] = { ...list[idx], status: body.status, currentOrderId: body.currentOrderId ?? list[idx].currentOrderId, current_order_id: body.currentOrderId ?? list[idx].current_order_id };
  await save(c, list);
  return c.json({ success: true, data: list[idx] }, 200);
});
