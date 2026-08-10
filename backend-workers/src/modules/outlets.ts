import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { authMiddleware } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

// ponytail: outlets = alias warehouses (1 gudang = 1 outlet). Upgrade path: tabel outlets terpisah bila perlu area/kanal.

const outletRespSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid().optional(),
  business_id: z.string().uuid().optional(),
  name: z.string(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isMain: z.boolean().optional(),
  is_main: z.boolean().optional(),
}).passthrough();

const outletCreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isMain: z.boolean().optional(),
  is_main: z.boolean().optional(),
});

type Vars = { businessId: string; userId: string; roleId: string };
export const outletsRoute = new OpenAPIHono<{ Bindings: any; Variables: Vars }>();
outletsRoute.use('*', authMiddleware);

function mapWare(r: any): any {
  return {
    id: r.id,
    businessId: r.business_id,
    business_id: r.business_id,
    name: r.name,
    address: r.address ?? '',
    phone: r.phone ?? '',
    isMain: !!r.is_default,
    is_main: !!r.is_default,
    isMainBranch: !!r.is_default,
    main: !!r.is_default,
    createdAt: r.created_at,
    created_at: r.created_at,
    ...r,
  };
}

const listRoute = createRoute({
  tags: ['Outlets'], method: 'get', path: '/',
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(z.array(outletRespSchema)) } }, description: 'Daftar outlet' } },
});

const createRouteDef = createRoute({
  tags: ['Outlets'], method: 'post', path: '/',
  request: { body: { content: { 'application/json': { schema: outletCreateSchema } } } },
  responses: { 201: { content: { 'application/json': { schema: createSuccessSchema(outletRespSchema) } }, description: 'Outlet created' } },
});

const patchRouteDef = createRoute({
  tags: ['Outlets'], method: 'patch', path: '/{id}',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: outletCreateSchema.partial() } } } },
  responses: { 200: { content: { 'application/json': { schema: createSuccessSchema(outletRespSchema) } }, description: 'Updated' } },
});

// @ts-ignore
outletsRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { data, error } = await supabase.from('warehouses').select('*').eq('business_id', businessId).order('created_at', { ascending: true });
  if (error) return c.json({ success: false, error: { message: 'Gagal mengambil outlet' } }, 500);
  return c.json({ success: true, data: (data || []).map(mapWare) }, 200);
});

// @ts-ignore
outletsRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const body = c.req.valid('json') as any;
  const { count } = await supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
  if (count !== null && count >= 5) return c.json({ success: false, error: { message: 'Batas outlet (5) tercapai' } }, 403);
  const { data, error } = await supabase.from('warehouses').insert({
    business_id: businessId,
    name: body.name,
    address: body.address ?? null,
    phone: body.phone ?? null,
    is_default: !!(body.isMain ?? body.is_main),
  }).select();
  if (error || !data?.length) return c.json({ success: false, error: { message: error?.message ?? 'Gagal membuat outlet' } }, 400);
  return c.json({ success: true, data: mapWare(data[0]) }, 201);
});

// @ts-ignore
outletsRoute.openapi(patchRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param') as any;
  const patch = c.req.valid('json') as any;
  const updateData: any = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) updateData.name = patch.name;
  if (patch.address !== undefined) updateData.address = patch.address;
  if (patch.phone !== undefined) updateData.phone = patch.phone;
  if (patch.isMain !== undefined || patch.is_main !== undefined) updateData.is_default = !!(patch.isMain ?? patch.is_main);
  const { data, error } = await supabase.from('warehouses').update(updateData).eq('id', id).eq('business_id', businessId).select();
  if (error || !data?.length) return c.json({ success: false, error: { message: 'Outlet tidak ditemukan' } }, 404);
  return c.json({ success: true, data: mapWare(data[0]) }, 200);
});
