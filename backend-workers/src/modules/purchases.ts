import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';

const purchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.number().positive(),
  cost_price: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val >= 0),
});

const purchaseSchema = z.object({
  warehouse_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  expected_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(purchaseItemSchema).min(1, "Data PO tidak lengkap"),
});

const purchaseStatusSchema = z.object({
  status: z.enum(["draft", "ordered", "received"]),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const purchasesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

purchasesRoute.use('*', authMiddleware);

purchasesRoute.get('/', requirePermission('purchases.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name), warehouses(name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map((p: any) => ({
      ...p,
      supplier_name: p.suppliers?.name || null,
      warehouse_name: p.warehouses?.name || null
    }));

    return c.json({ success: true, data: keysToCamel(formattedData) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil PO" } }, 500);
  }
});

purchasesRoute.get('/:id', requirePermission('purchases.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name), warehouses(name)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !po) return c.json({ success: false, error: { message: "PO tidak ditemukan" } }, 404);

    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*, products(name, sku)')
      .eq('po_id', id);

    const formattedPo = {
      ...po,
      supplier_name: po.suppliers?.name || null,
      warehouse_name: po.warehouses?.name || null,
      items: (items || []).map((item: any) => ({
        ...item,
        product_name: item.products?.name || null,
        sku: item.products?.sku || null
      }))
    };

    return c.json({ success: true, data: keysToCamel(formattedPo) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil detail PO" } }, 500);
  }
});

purchasesRoute.post('/', requirePermission('purchases.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const { warehouse_id, supplier_id, expected_date, notes, items } = purchaseSchema.parse(body);

    // Validate warehouse
    const { data: wh, error: whErr } = await supabase.from('warehouses').select('id').eq('id', warehouse_id).eq('business_id', businessId).single();
    if (whErr || !wh) throw new Error("Gudang tidak valid atau bukan milik bisnis ini");

    // Validate supplier
    const { data: sup, error: supErr } = await supabase.from('suppliers').select('id').eq('id', supplier_id).eq('business_id', businessId).single();
    if (supErr || !sup) throw new Error("Supplier tidak valid atau bukan milik bisnis ini");

    // Validate products
    const productIds = items.map(i => i.product_id);
    if (productIds.length > 0) {
      const { data: validProducts, error: vpErr } = await supabase.from('products').select('id').eq('business_id', businessId).in('id', productIds);
      if (vpErr || !validProducts || validProducts.length !== productIds.length) {
        throw new Error("Terdapat produk yang tidak valid atau bukan milik bisnis ini");
      }
    }

    const { count } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    const nextId = (count || 0) + 1;
    const poNumber = `PO/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${String(nextId).padStart(4, "0")}`;

    let totalAmount = 0;
    for (const item of items) totalAmount += item.qty * item.cost_price;

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        business_id: businessId,
        warehouse_id,
        supplier_id,
        po_number: poNumber,
        status: 'draft',
        total_amount: totalAmount.toString(),
        expected_date: expected_date ? new Date(expected_date).toISOString() : null,
        notes: notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (poError || !po) throw poError || new Error("Gagal membuat PO");

    if (items.length > 0) {
      await supabase.from('purchase_order_items').insert(
        items.map((item: any) => ({
          po_id: po.id,
          product_id: item.product_id,
          qty: item.qty,
          cost_price: item.cost_price.toString(),
        }))
      );
    }

    return c.json({ success: true, data: keysToCamel(po) }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menyimpan PO" } }, 400);
  }
});

purchasesRoute.patch('/:id/status', requirePermission('purchases.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { status } = purchaseStatusSchema.parse(body);

    const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).eq('business_id', businessId).single();
    if (!po) return c.json({ success: false, error: { message: "PO tidak ditemukan" } }, 404);
    if (po.status === "received") return c.json({ success: false, error: { message: "PO yang sudah diterima tidak dapat diubah statusnya" } }, 400);

    const { data: updatedPo } = await supabase
      .from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (status === "received") {
      const { data: itemsRes } = await supabase.from('purchase_order_items').select('*').eq('po_id', id);
      
      const qtyByProduct = new Map<string, number>();
      for (const item of (itemsRes || [])) {
        qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) || 0) + item.qty);
      }

      for (const [productId, quantity] of qtyByProduct.entries()) {
        const { data: stockData } = await supabase
          .from('product_stock')
          .select('quantity')
          .eq('product_id', productId)
          .eq('warehouse_id', po.warehouse_id)
          .single();
          
        if (stockData) {
          await supabase
            .from('product_stock')
            .update({ quantity: stockData.quantity + quantity, updated_at: new Date().toISOString() })
            .eq('product_id', productId)
            .eq('warehouse_id', po.warehouse_id);
        } else {
          await supabase
            .from('product_stock')
            .insert({ product_id: productId, warehouse_id: po.warehouse_id, quantity: quantity });
        }
      }
    }

    return c.json({ success: true, data: keysToCamel(updatedPo) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengupdate status PO" } }, 400);
  }
});
