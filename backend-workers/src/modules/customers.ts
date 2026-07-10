import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

const customerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan wajib diisi').max(255),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  address: z.string().nullable().optional(),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const customersRoute = new Hono<{ Bindings: any, Variables: Variables }>();

customersRoute.use('*', authMiddleware);

const calculateTier = (totalSpent: number) => {
  if (totalSpent >= 5000000) return 'Gold';
  if (totalSpent >= 1000000) return 'Silver';
  return 'Reguler';
};

customersRoute.get('/', requirePermission('customers.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const search = c.req.query('search');

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

    return c.json({ success: true, data: keysToCamel(result) });
  } catch (err: any) {
    console.error("Customers GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil daftar pelanggan" } }, 500);
  }
});

customersRoute.get('/:id', requirePermission('customers.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

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

    return c.json({ success: true, data: keysToCamel(result) });
  } catch (err: any) {
    console.error("Customer GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil pelanggan" } }, 500);
  }
});

customersRoute.post('/', requirePermission('customers.write'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const dataObj = customerSchema.parse(body);

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
    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

customersRoute.put('/:id', requirePermission('customers.write'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const dataObj = customerSchema.parse(body);

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

    return c.json({ success: true, data: keysToCamel(data[0]) });
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
