import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { createSuccessSchema } from '../schemas/common';

// ponytail: KV/Map fallback; upgrade ke tabel Supabase bila scale.

const discSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  value: z.number().optional(),
  code: z.string().nullable().optional(),
  minPurchase: z.number().optional(),
  min_purchase: z.number().optional(),
  applicableProductIds: z.array(z.string()).optional(),
}).passthrough();

type Vars = { businessId: string; userId: string; roleId: string };
export const discountsRoute = new OpenAPIHono<{ Bindings: any; Variables: Vars }>();
discountsRoute.use('*', authMiddleware);

const mem = new Map<string, any[]>();
async function load(c: any): Promise<any[]> {
  const bid = c.get('businessId') as string;
  const kv = (c.env as any)?.RATE_LIMIT_KV;
  if (kv) { try { const raw = await kv.get(`discounts:${bid}`); if (raw) return JSON.parse(raw); } catch {} }
  return mem.get(bid) || [];
}
async function save(c: any, list: any[]) {
  const bid = c.get('businessId') as string;
  mem.set(bid, list);
  const kv = (c.env as any)?.RATE_LIMIT_KV;
  if (kv) { try { await kv.put(`discounts:${bid}`, JSON.stringify(list)); } catch {} }
}

const listRoute = createRoute({
  tags: ['Discounts'], method: 'get', path: '/',
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(z.array(discSchema)) } }, description: 'Daftar diskon' } },
});

const createRouteDef = createRoute({
  tags: ['Discounts'], method: 'post', path: '/',
  request: { body: { content: { 'application/json': { schema: discSchema } } } },
  responses: { 201: { content: { 'application/json': { schema: createSuccessSchema(discSchema) } }, description: 'Created' } },
});

const putRouteDef = createRoute({
  tags: ['Discounts'], method: 'put', path: '/{id}',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: discSchema } } } },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(discSchema) } }, description: 'Updated' } },
});

const deleteRouteDef = createRoute({
  tags: ['Discounts'], method: 'delete', path: '/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(z.object({ id: z.string() })) } }, description: 'Deleted' } },
});

const validateRoute = createRoute({
  tags: ['Discounts'], method: 'post', path: '/validate',
  request: { body: { content: { 'application/json': { schema: z.object({ code: z.string().optional(), subtotal: z.number().optional(), productId: z.string().optional() }) } } } },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(discSchema.nullable()) } }, description: 'Validated' } },
});

// @ts-ignore
discountsRoute.openapi(listRoute, async (c) => {
  return c.json({ success: true, data: await load(c) }, 200);
});

// @ts-ignore
discountsRoute.openapi(createRouteDef, async (c) => {
  const body = c.req.valid('json') as any;
  const id = body.id ?? crypto.randomUUID();
  const row = { id, ...body, minPurchase: body.minPurchase ?? body.min_purchase ?? 0 };
  const list = await load(c);
  list.push(row);
  await save(c, list);
  return c.json({ success: true, data: row }, 201);
});

// @ts-ignore
discountsRoute.openapi(putRouteDef, async (c) => {
  const { id } = c.req.valid('param') as any;
  const body = c.req.valid('json') as any;
  const list = await load(c);
  const idx = list.findIndex((x: any) => x.id === id);
  if (idx < 0) return c.json({ success: false, error: { message: 'Diskon tidak ditemukan' } }, 404);
  list[idx] = { ...list[idx], ...body, id };
  await save(c, list);
  return c.json({ success: true, data: list[idx] }, 200);
});

// @ts-ignore
discountsRoute.openapi(deleteRouteDef, async (c) => {
  const { id } = c.req.valid('param') as any;
  const list = await load(c);
  const next = list.filter((x: any) => x.id !== id);
  if (next.length === list.length) return c.json({ success: false, error: { message: 'Diskon tidak ditemukan' } }, 404);
  await save(c, next);
  return c.json({ success: true, data: { id } }, 200);
});

// @ts-ignore
discountsRoute.openapi(validateRoute, async (c) => {
  const { code, subtotal, productId } = c.req.valid('json') as any;
  const list = await load(c);
  if (!code) return c.json({ success: true, data: null }, 200);
  const found = list.find((d: any) => (d.code ?? '').toLowerCase() === String(code).toLowerCase());
  if (!found) return c.json({ success: true, data: null }, 200);
  // minimal purchase check
  const min = found.minPurchase ?? found.min_purchase ?? 0;
  if (subtotal != null && subtotal < min) return c.json({ success: true, data: null }, 200);
  return c.json({ success: true, data: found }, 200);
});
