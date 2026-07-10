import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

const debtSchema = z.object({
  type: z.enum(["hutang", "piutang"]),
  entity_name: z.string().min(1, "Nama entitas wajib diisi").max(255),
  entity_phone: z.string().max(30).nullable().optional(),
  amount: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val > 0, "Nominal harus lebih dari 0"),
  due_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const paymentSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val > 0, "Nominal pembayaran tidak valid"),
  payment_method: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});

type Variables = { businessId: string; userId: string };
export const debtsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

debtsRoute.use('*', mockAuth);

debtsRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const type = c.req.query('type');
  const status = c.req.query('status');

  try {
    let query = supabase
      .from('debts')
      .select('*')
      .eq('business_id', businessId)
      // Supabase REST does not support NULLS LAST easily on order, fallback to default order
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data hutang/piutang" } }, 500);
  }
});

debtsRoute.delete('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: debtRes, error: debtError } = await supabase
      .from('debts')
      .select('id')
      .eq('id', id)
      .eq('business_id', businessId)
      .limit(1);

    if (debtError || !debtRes || debtRes.length === 0) {
      return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);
    }

    await supabase.from('debt_payments').delete().eq('debt_id', id);
    await supabase.from('debts').delete().eq('id', id).eq('business_id', businessId);

    return c.json({ success: true, message: "Hutang/Piutang berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghapus data" } }, 500);
  }
});

debtsRoute.post('/:id/remind', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: debtRes, error: debtError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (debtError || !debtRes) {
      return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);
    }

    if (!debtRes.entity_phone) {
      return c.json({ success: false, error: { message: "Nomor telepon pelanggan/supplier tidak tersedia" } }, 400);
    }

    if (debtRes.status === 'paid') {
      return c.json({ success: false, error: { message: "Tagihan ini sudah lunas" } }, 400);
    }

    // Simulasi pengiriman WA di workers (mock)
    return c.json({ success: true, message: "Pengingat WA berhasil dikirim (disimulasikan dari Workers)" });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal memproses pengingat" } }, 500);
  }
});

debtsRoute.get('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: debtData, error: debtError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (debtError || !debtData) {
      return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);
    }

    const { data: paymentsData } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', id)
      .order('payment_date', { ascending: false });

    return c.json({
      success: true,
      data: keysToCamel({
        ...debtData,
        payments: paymentsData || []
      })
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data detail" } }, 500);
  }
});

debtsRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const dataObj = debtSchema.parse(body);

    const { data, error } = await supabase
      .from('debts')
      .insert({
        business_id: businessId,
        type: dataObj.type,
        entity_name: dataObj.entity_name,
        entity_phone: dataObj.entity_phone || null,
        amount: dataObj.amount.toString(),
        remaining_amount: dataObj.amount.toString(),
        due_date: dataObj.due_date ? new Date(dataObj.due_date).toISOString() : null,
        notes: dataObj.notes || null,
        created_by: userId,
      })
      .select();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data[0]) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

debtsRoute.post('/:id/payments', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const dataObj = paymentSchema.parse(body);

    const { data: debtData, error: debtError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (debtError || !debtData) throw new Error("Data tidak ditemukan");

    const currentRemaining = parseFloat(debtData.remaining_amount);
    const currentAmount = parseFloat(debtData.amount);

    if (debtData.status === "paid" || currentRemaining <= 0) {
      throw new Error("Tagihan sudah lunas");
    }

    let paymentAmount = dataObj.amount;
    if (paymentAmount > currentRemaining) {
      paymentAmount = currentRemaining;
    }

    const newRemaining = currentRemaining - paymentAmount;
    let newStatus = debtData.status;

    if (newRemaining <= 0) {
      newStatus = "paid";
    } else if (newRemaining < currentAmount) {
      newStatus = "partial";
    }

    // Insert payment
    const { error: insertError } = await supabase
      .from('debt_payments')
      .insert({
        debt_id: id,
        amount: paymentAmount.toString(),
        payment_method: dataObj.payment_method || "cash",
        notes: dataObj.notes || null,
        created_by: userId,
      });
      
    if (insertError) throw insertError;

    // Update debt
    const { data: updatedDebt, error: updateError } = await supabase
      .from('debts')
      .update({
        remaining_amount: newRemaining.toString(),
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (updateError) throw updateError;

    return c.json({ success: true, data: keysToCamel(updatedDebt[0]) });
  } catch (err: any) {
    const statusMap: Record<string, number> = { "Data tidak ditemukan": 404, "Tagihan sudah lunas": 400 };
    if (statusMap[err.message]) {
      return c.json({ success: false, error: { message: err.message } }, statusMap[err.message]);
    }
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
