import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

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

type Variables = { businessId: string; userId: string };
export const purchasesRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

purchasesRoute.use('*', mockAuth);

purchasesRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name), warehouses(name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = (data || []).map((po: any) => {
      const { suppliers, warehouses, ...rest } = po;
      return {
        ...rest,
        supplier_name: suppliers?.name || null,
        warehouse_name: warehouses?.name || null
      };
    });

    return c.json({ success: true, data: keysToCamel(result) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil PO" } }, 500);
  }
});

purchasesRoute.get('/:id', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name), warehouses(name)')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (poError || !poData) {
      return c.json({ success: false, error: { message: "PO tidak ditemukan" } }, 404);
    }

    const { suppliers, warehouses, ...poRest } = poData;
    const formattedPo = {
      ...poRest,
      supplier_name: suppliers?.name || null,
      warehouse_name: warehouses?.name || null
    };

    const { data: itemsData, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('*, products(name, sku)')
      .eq('po_id', id);

    if (itemsError) throw itemsError;

    const formattedItems = (itemsData || []).map((item: any) => {
      const { products, ...rest } = item;
      return {
        ...rest,
        product_name: products?.name || null,
        sku: products?.sku || null
      };
    });

    return c.json({
      success: true,
      data: keysToCamel({
        ...formattedPo,
        items: formattedItems
      })
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil detail PO" } }, 500);
  }
});

purchasesRoute.post('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const userId = c.get('userId');

  try {
    const body = await c.req.json();
    const dataObj = purchaseSchema.parse(body);

    // Get count for PO Number
    const { count } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    const nextId = (count || 0) + 1;
    const poNumber = `PO/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${String(nextId).padStart(4, "0")}`;

    let totalAmount = 0;
    for (const item of dataObj.items) {
      totalAmount += item.qty * item.cost_price;
    }

    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        business_id: businessId,
        warehouse_id: dataObj.warehouse_id,
        supplier_id: dataObj.supplier_id,
        po_number: poNumber,
        status: 'draft',
        total_amount: totalAmount.toString(),
        expected_date: dataObj.expected_date ? new Date(dataObj.expected_date).toISOString() : null,
        notes: dataObj.notes || null,
        created_by: userId,
      })
      .select();

    if (poError) throw poError;
    const po = poData[0];

    try {
      if (dataObj.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(
            dataObj.items.map((item: any) => ({
              po_id: po.id,
              product_id: item.product_id,
              qty: item.qty,
              cost_price: item.cost_price.toString(),
            }))
          );
        if (itemsError) throw itemsError;
      }
    } catch (innerErr) {
      await supabase.from('purchase_orders').delete().eq('id', po.id);
      throw innerErr;
    }

    return c.json({ success: true, data: keysToCamel(po) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

purchasesRoute.patch('/:id/status', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const body = await c.req.json();
    const { status } = purchaseStatusSchema.parse(body);

    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (poError || !poData) throw new Error("PO tidak ditemukan");
    if (poData.status === "received") throw new Error("PO yang sudah diterima tidak dapat diubah statusnya");

    const { data: updatedData, error: updateError } = await supabase
      .from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (updateError) throw updateError;
    const updatedPo = updatedData[0];

    if (status === "received") {
      const { data: itemsData } = await supabase.from('purchase_order_items').select('*').eq('po_id', id);
      
      if (itemsData && itemsData.length > 0) {
        const qtyByProduct = new Map<string, number>();
        for (const item of itemsData) {
          qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) || 0) + item.qty);
        }

        // Handle stock sequentially to add to existing stock
        for (const [productId, quantity] of qtyByProduct.entries()) {
          const { data: existingStock } = await supabase
            .from('product_stock')
            .select('quantity')
            .eq('product_id', productId)
            .eq('warehouse_id', updatedPo.warehouse_id)
            .single();

          if (existingStock) {
            await supabase
              .from('product_stock')
              .update({
                quantity: existingStock.quantity + quantity,
                updated_at: new Date().toISOString()
              })
              .eq('product_id', productId)
              .eq('warehouse_id', updatedPo.warehouse_id);
          } else {
             // If for some reason stock entry doesn't exist, insert it
             await supabase
               .from('product_stock')
               .insert({
                  product_id: productId,
                  warehouse_id: updatedPo.warehouse_id,
                  quantity: quantity
               });
          }
        }
      }
    }

    return c.json({ success: true, data: keysToCamel(updatedPo) });
  } catch (err: any) {
    const statusMap: Record<string, number> = { "PO tidak ditemukan": 404, "PO yang sudah diterima tidak dapat diubah statusnya": 400 };
    if (statusMap[err.message]) {
      return c.json({ success: false, error: { message: err.message } }, statusMap[err.message]);
    }
    const msg = err.issues ? "Input tidak valid" : err.message;
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});
