import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

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

type Variables = { businessId: string; userId: string; roleId: string };
export const debtsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

debtsRoute.use('*', authMiddleware);

debtsRoute.get('/', requirePermission('debts.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const type = c.req.query('type');
  const status = c.req.query('status');

  try {
    let query = supabase.from('debts').select('*').eq('business_id', businessId);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data || []) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data hutang/piutang" } }, 500);
  }
});

debtsRoute.post('/', requirePermission('debts.manage'), async (c) => {
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
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data: keysToCamel(data) }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menyimpan hutang/piutang" } }, 400);
  }
});

debtsRoute.delete('/:id', requirePermission('debts.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: debtRes } = await supabase.from('debts').select('id').eq('id', id).eq('business_id', businessId).single();
    if (!debtRes) return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);

    await supabase.from('debt_payments').delete().eq('debt_id', id);
    await supabase.from('debts').delete().eq('id', id).eq('business_id', businessId);

    return c.json({ success: true, message: "Hutang/Piutang berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghapus hutang/piutang" } }, 500);
  }
});

debtsRoute.post('/:id/remind', requirePermission('debts.manage'), async (c) => {
  return c.json({ success: true, message: "Pengingat WA berhasil dikirim (simulasi)" });
});

debtsRoute.get('/:id', requirePermission('debts.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: debt, error } = await supabase.from('debts').select('*').eq('id', id).eq('business_id', businessId).single();
    if (error || !debt) return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);

    const { data: payments } = await supabase.from('debt_payments').select('*').eq('debt_id', id).order('payment_date', { ascending: false });

    return c.json({ success: true, data: keysToCamel({ ...debt, payments: payments || [] }) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data hutang/piutang" } }, 500);
  }
});

debtsRoute.post('/:id/payments', requirePermission('debts.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { amount, payment_method, notes } = paymentSchema.parse(body);

    const { data: debt } = await supabase.from('debts').select('*').eq('id', id).eq('business_id', businessId).single();
    if (!debt) return c.json({ success: false, error: { message: "Data tidak ditemukan" } }, 404);

    const currentRemaining = parseFloat(debt.remaining_amount);
    const currentAmount = parseFloat(debt.amount);

    if (debt.status === "paid" || currentRemaining <= 0) {
      return c.json({ success: false, error: { message: "Tagihan sudah lunas" } }, 400);
    }

    let paymentAmount = amount;
    if (paymentAmount > currentRemaining) paymentAmount = currentRemaining;
    const newRemaining = currentRemaining - paymentAmount;
    let newStatus = debt.status;

    if (newRemaining <= 0) newStatus = "paid";
    else if (newRemaining < currentAmount) newStatus = "partial";

    await supabase.from('debt_payments').insert({
      debt_id: id,
      amount: paymentAmount.toString(),
      payment_method: payment_method || "cash",
      notes: notes || null,
      created_by: userId,
    });

    const { data: updatedDebt } = await supabase
      .from('debts')
      .update({ remaining_amount: newRemaining.toString(), status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return c.json({ success: true, data: keysToCamel(updatedDebt) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menyimpan pembayaran" } }, 400);
  }
});
