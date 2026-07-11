import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

const customerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan wajib diisi').max(255).openapi({ example: 'Budi Santoso' }),
  phone: z.string().max(30).nullable().optional().openapi({ example: '08123456789' }),
  email: z.string().max(255).nullable().optional().openapi({ example: 'budi@example.com' }),
  address: z.string().nullable().optional().openapi({ example: 'Jl. Merdeka No 3' }),
});

const customerResponseSchema = z.object({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  total_spent: z.number().optional(),
  tier: z.string().optional(),
});

const listRoute = createRoute({
  tags: ['Customers'],
  method: 'get',
  path: '/',
  description: 'Mendapatkan daftar pelanggan',
  request: {
    query: z.object({
      search: z.string().optional().openapi({ example: 'budi' })
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(customerResponseSchema)) } },
      description: 'Daftar pelanggan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const getByIdRoute = createRoute({
  tags: ['Customers'],
  method: 'get',
  path: '/{id}',
  description: 'Mendapatkan detail pelanggan',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(customerResponseSchema) } },
      description: 'Data pelanggan',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Pelanggan tidak ditemukan',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  }
});

const createRouteDef = createRoute({
  tags: ['Customers'],
  method: 'post',
  path: '/',
  description: 'Membuat pelanggan baru (maksimal 2000)',
  request: {
    body: {
      content: { 'application/json': { schema: customerSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(customerResponseSchema) } },
      description: 'Pelanggan berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    403: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Kuota pelanggan terpenuhi',
    },
  },
});

const updateRouteDef = createRoute({
  tags: ['Customers'],
  method: 'put',
  path: '/{id}',
  description: 'Mengubah data pelanggan',
  request: {
    params: z.object({
      id: z.string().uuid()
    }),
    body: {
      content: { 'application/json': { schema: customerSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(customerResponseSchema) } },
      description: 'Pelanggan berhasil diubah',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid input',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Pelanggan tidak ditemukan',
    }
  },
});

const calculateTier = (totalSpent: number) => {
  if (totalSpent >= 5000000) return 'Gold';
  if (totalSpent >= 1000000) return 'Silver';
  return 'Reguler';
};

type Variables = { businessId: string; userId: string; roleId: string };
export const customersRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

customersRoute.use('*', authMiddleware);

customersRoute.get('/', requirePermission('customers.read'));
customersRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { search } = c.req.valid('query');

  try {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: customersData, error: customersError } = await query;
    if (customersError) throw customersError;

    // Fetch sales to calculate totalSpent
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('customer_id, grand_total')
      .eq('business_id', businessId)
      .eq('status', 'paid');
    
    if (salesError) throw salesError;

    // Aggregate sales per customer
    const spentMap: Record<string, number> = {};
    for (const sale of salesData || []) {
      if (sale.customer_id) {
        spentMap[sale.customer_id] = (spentMap[sale.customer_id] || 0) + Number(sale.grand_total);
      }
    }

    const result = (customersData || []).map((customer: any) => {
      const totalSpent = spentMap[customer.id] || 0;
      return {
        ...customer,
        total_spent: totalSpent,
        tier: calculateTier(totalSpent)
      };
    });

    return c.json({ success: true, data: result }, 200);
  } catch (err: any) {
    console.error("Customers GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil daftar pelanggan" } }, 500);
  }
});

customersRoute.get('/:id', requirePermission('customers.read'));
customersRoute.openapi(getByIdRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (customerError) {
      return c.json({ success: false, error: { message: "Pelanggan tidak ditemukan" } }, 404);
    }

    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('grand_total')
      .eq('customer_id', id)
      .eq('business_id', businessId)
      .eq('status', 'paid');
    
    if (salesError) throw salesError;

    const totalSpent = (salesData || []).reduce((sum, sale) => sum + Number(sale.grand_total), 0);
    const result = {
      ...customer,
      total_spent: totalSpent,
      tier: calculateTier(totalSpent)
    };

    return c.json({ success: true, data: result }, 200);
  } catch (err: any) {
    console.error("Customer GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil pelanggan" } }, 500);
  }
});

customersRoute.post('/', requirePermission('customers.write'));
customersRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const dataObj = c.req.valid('json');

    // Validate quota: max 2000 customers
    const { count: customerCount, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    
    if (countError) throw countError;
    if (customerCount !== null && customerCount >= 2000) {
      return c.json({ success: false, error: { message: "Batas paket gratis (2000 item) sudah tercapai" } }, 403);
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: dataObj.name,
        phone: dataObj.phone || null,
        email: dataObj.email || null,
        address: dataObj.address || null,
        created_by: userId
      })
      .select();

    if (error) throw error;
    return c.json({ success: true, data: data[0] }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

customersRoute.put('/:id', requirePermission('customers.write'));
customersRoute.openapi(updateRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

  try {
    const dataObj = c.req.valid('json');

    const { data, error } = await supabase
      .from('customers')
      .update({
        name: dataObj.name,
        phone: dataObj.phone || null,
        email: dataObj.email || null,
        address: dataObj.address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select();

    if (error || !data || data.length === 0) {
      return c.json({ success: false, error: { message: "Pelanggan tidak ditemukan" } }, 404);
    }

    return c.json({ success: true, data: data[0] }, 200);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
