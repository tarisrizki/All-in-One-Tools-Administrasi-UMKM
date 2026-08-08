import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';
import { keysToCamel } from '../utils/caseConverter';

const opnameStatusSchema = z.enum(['draft', 'counted', 'approved', 'cancelled']);

const opnameItemSchema = z.object({
  product_id: z.string().uuid(),
  system_qty: z.number().int(),
  counted_qty: z.number().int(),
});

const opnameSchema = z.object({
  warehouse_id: z.string().uuid(),
  reason: z.string().nullable().optional(),
});

const opnameResponseSchema = z.object({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  status: z.string(),
  counted_at: z.string().nullable(),
  approved_by: z.string().uuid().nullable(),
  reason: z.string().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

const opnameItemResponseSchema = z.object({
  id: z.string().uuid(),
  opname_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string().nullable(),
  system_qty: z.number().int(),
  counted_qty: z.number().int(),
  variance: z.number().int(),
});

const listRoute = createRoute({
  tags: ['Stock Opname'],
  method: 'get',
  path: '/',
  request: {
    query: z.object({
      status: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(opnameResponseSchema)) } },
      description: 'Daftar stock opname',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    },
  },
});

const createRouteDef = createRoute({
  tags: ['Stock Opname'],
  method: 'post',
  path: '/',
  request: {
    body: {
      content: { 'application/json': { schema: opnameSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(opnameResponseSchema) } },
      description: 'Stock opname draft dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    },
  },
});

const itemsRoute = createRoute({
  tags: ['Stock Opname'],
  method: 'post',
  path: '/{id}/items',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.array(z.object({
      product_id: z.string().uuid(),
      system_qty: z.number().int(),
      counted_qty: z.number().int(),
    })).min(1),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Item count diupdate',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Opname tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    },
  },
});

const approveRoute = createRoute({
  tags: ['Stock Opname'],
  method: 'post',
  path: '/{id}/approve',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      reason: z.string(),
      approved_by: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSuccessSchema } },
      description: 'Opname disetujui',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input/error',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Opname tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    },
  },
});

const reportRoute = createRoute({
  tags: ['Stock Opname'],
  method: 'get',
  path: '/report',
  request: {
    query: z.object({
      business_id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            total_variance: z.number(),
            shrinkage: z.number(),
            total_gain: z.number(),
          }),
        },
      },
      description: 'Ringkasan varians',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    },
  },
});

export const stockOpnamesRoute = new OpenAPIHono<{ Bindings: any, Variables: { businessId: string; userId: string; roleId: string } }>();

stockOpnamesRoute.use('*', authMiddleware);

stockOpnamesRoute.get('/', requirePermission('stock_opnames.read'));
stockOpnamesRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const status = c.req.query('status');

  try {
    let query = supabase.from('stock_opnames').select('*, warehouses(name)').eq('business_id', businessId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map(o => ({...o, warehouse_name: o.warehouses?.name }));
    return c.json({ success: true, data: keysToCamel(formatted) }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal mengambil opname' } }, 500);
  }
});

stockOpnamesRoute.post('/', requirePermission('stock_opnames.write'));
stockOpnamesRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  try {
    const { data, error } = await supabase.from('stock_opnames').insert({
      ...body,
      business_id: businessId,
      created_by: userId,
      status: 'draft'
    }).select().single();
    if (error) throw error;
    return c.json({ success: true, data: keysToCamel(data) }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal membuat opname' } }, 400);
  }
});

stockOpnamesRoute.post('/:id/items', requirePermission('stock_opnames.write'));
stockOpnamesRoute.openapi(itemsRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const opnameId = c.req.param('id');
  const items = c.req.valid('json');
  const businessId = c.get('businessId');

  try {
    // Get system qty for each product first
    const { data: opname } = await supabase.from('stock_opnames').select('warehouse_id').eq('id', opnameId).eq('business_id', businessId).single();
    if (!opname) return c.json({ success: false, error: { message: 'Opname tidak ditemukan' } }, 404);

    const opnameItems = items.map(i => ({
      opname_id: opnameId,
      product_id: i.product_id,
      system_qty: i.system_qty,
      counted_qty: i.counted_qty,
    }));

    const { error } = await supabase.from('stock_opname_items').insert(opnameItems);
    if (error) throw error;

    return c.json({ success: true, message: 'Items counted' }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal mencatat item' } }, 400);
  }
});

stockOpnamesRoute.post('/:id/approve', requirePermission('stock_opnames.approve'));
stockOpnamesRoute.openapi(approveRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const opnameId = c.req.param('id');
  const { reason, approved_by } = c.req.valid('json');
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase.rpc('approve_stock_opname', {
      p_opname_id: opnameId,
      p_business_id: businessId,
      p_approved_by: approved_by,
      p_reason: reason
    });
    if (error) throw error;
    return c.json({ success: true, data }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal menyetujui opname' } }, 400);
  }
});

stockOpnamesRoute.get('/report', requirePermission('reports.read'));
stockOpnamesRoute.openapi(reportRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { startDate, endDate } = c.req.query();

  try {
    let query = supabase.from('stock_opname_items').select('variance, opname_id(status, created_at)');
    if (startDate) query = query.gte('opname_id.created_at', startDate);
    if (endDate) query = query.lte('opname_id.created_at', endDate);
    
    const { data, error } = await query.eq('opname_id.business_id', businessId);
    if (error) throw error;

    let totalVariance = 0;
    let totalGain = 0;
    let totalShrinkage = 0;

    data.forEach(i => {
      totalVariance += i.variance;
      if (i.variance > 0) totalGain += i.variance;
      else totalShrinkage += Math.abs(i.variance);
    });

    return c.json({
      success: true,
      data: {
        total_variance: totalVariance,
        total_gain: totalGain,
        shrinkage: totalShrinkage
      }
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Gagal mengambil laporan' } }, 500);
  }
});