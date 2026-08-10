import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

// ponytail: KV/Map fallback. Upgrade: tabel Supabase loyalty_* bila scale.

const memberSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  points: z.number().optional(),
  tier: z.string().optional(),
  earnRate: z.number().optional(),
}).passthrough();

type Vars = { businessId: string; userId: string; roleId: string };
export const loyaltyRoute = new OpenAPIHono<{ Bindings: any; Variables: Vars }>();
loyaltyRoute.use('*', authMiddleware);

const mem = new Map<string, any[]>();
async function load(c: any): Promise<any[]> {
  const bid = c.get('businessId') as string;
  const kv = (c.env as any)?.RATE_LIMIT_KV;
  if (kv) { try { const raw = await kv.get(`loyalty:${bid}`); if (raw) return JSON.parse(raw); } catch {} }
  return mem.get(bid) || [];
}
async function save(c: any, list: any[]) {
  const bid = c.get('businessId') as string;
  mem.set(bid, list);
  const kv = (c.env as any)?.RATE_LIMIT_KV;
  if (kv) { try { await kv.put(`loyalty:${bid}`, JSON.stringify(list)); } catch {} }
}

const listRoute = createRoute({
  tags: ['Loyalty'], method: 'get', path: '/',
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(z.array(memberSchema)) } }, description: 'Loyalty members' } },
});

const getRoute = createRoute({
  tags: ['Loyalty'], method: 'get', path: '/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(memberSchema) } }, description: 'OK' }, 404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' } },
});

const createRouteDef = createRoute({
  tags: ['Loyalty'], method: 'post', path: '/',
  request: { body: { content: { 'application/json': { schema: memberSchema } } } },
  responses: { 201: { content: { 'application/json': { schema: createSuccessSchema(memberSchema) } }, description: 'Created' } },
});

const earnRoute = createRoute({
  tags: ['Loyalty'], method: 'post', path: '/{id}/earn',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ points: z.number() }) } } } },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(memberSchema) } }, description: 'Earned' }, 404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Not found' } },
});

const redeemRoute = createRoute({
  tags: ['Loyalty'], method: 'post', path: '/{id}/redeem',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ points: z.number() }) } } } },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(memberSchema) } }, description: 'Redeemed' }, 400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Insufficient points' } },
});

// @ts-ignore
loyaltyRoute.openapi(listRoute, async (c) => c.json({ success: true, data: await load(c) }, 200));

// @ts-ignore
loyaltyRoute.openapi(getRoute, async (c) => {
  const { id } = c.req.valid('param') as any;
  const list = await load(c);
  const found = list.find((x: any) => x.id === id);
  if (!found) return c.json({ success: false, error: { message: 'Member tidak ditemukan' } }, 404);
  return c.json({ success: true, data: found }, 200);
});

// @ts-ignore
loyaltyRoute.openapi(createRouteDef, async (c) => {
  const body = c.req.valid('json') as any;
  const id = body.id ?? crypto.randomUUID();
  const row = { points: 0, tier: 'bronze', earnRate: 1, ...body, id };
  const list = await load(c);
  list.push(row);
  await save(c, list);
  return c.json({ success: true, data: row }, 201);
});

// @ts-ignore
loyaltyRoute.openapi(earnRoute, async (c) => {
  const { id } = c.req.valid('param') as any;
  const { points } = c.req.valid('json') as any;
  const list = await load(c);
  const idx = list.findIndex((x: any) => x.id === id);
  if (idx < 0) return c.json({ success: false, error: { message: 'Member tidak ditemukan' } }, 404);
  list[idx] = { ...list[idx], points: (list[idx].points || 0) + Number(points) };
  await save(c, list);
  return c.json({ success: true, data: list[idx] }, 200);
});

// @ts-ignore
loyaltyRoute.openapi(redeemRoute, async (c) => {
  const { id } = c.req.valid('param') as any;
  const { points } = c.req.valid('json') as any;
  const list = await load(c);
  const idx = list.findIndex((x: any) => x.id === id);
  if (idx < 0) return c.json({ success: false, error: { message: 'Member tidak ditemukan' } }, 404);
  if ((list[idx].points || 0) < Number(points)) return c.json({ success: false, error: { message: 'Poin tidak cukup' } }, 400);
  list[idx] = { ...list[idx], points: (list[idx].points || 0) - Number(points) };
  await save(c, list);
  return c.json({ success: true, data: list[idx] }, 200);
});
