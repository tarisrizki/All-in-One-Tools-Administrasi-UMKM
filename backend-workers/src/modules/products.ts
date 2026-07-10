import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth';
import bwipjs from 'bwip-js';

const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(255),
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  minStock: z.number().min(0).default(5),
  initialStock: z.number().min(0).default(0),
});

type Variables = { businessId: string; userId: string; roleId: string };
export const productsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

productsRoute.use('*', authMiddleware);

productsRoute.get('/', requirePermission('products.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const search = c.req.query('search');

  try {
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    const { data: productsData, error: productsError } = await query;
    if (productsError) throw productsError;

    const productIds = (productsData || []).map((p: any) => p.id);

    let stockMap: Record<string, number> = {};
    if (productIds.length > 0) {
      const { data: stockData, error: stockError } = await supabase
        .from('product_stock')
        .select('product_id, quantity')
        .in('product_id', productIds);
      
      if (stockError) throw stockError;

      for (const stock of stockData || []) {
        stockMap[stock.product_id] = (stockMap[stock.product_id] || 0) + Number(stock.quantity);
      }
    }

    const result = (productsData || []).map((p: any) => ({
      id: p.id,
      business_id: p.business_id,
      category_id: p.category_id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      cost_price: p.cost_price,
      sell_price: p.sell_price,
      min_stock: p.min_stock,
      created_at: p.created_at,
      updated_at: p.updated_at,
      category_name: p.categories?.name || null,
      stock: stockMap[p.id] || 0
    }));

    return c.json({ success: true, data: keysToCamel(result) });
  } catch (err: any) {
    console.error("Products GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil produk" } }, 500);
  }
});

productsRoute.post('/', requirePermission('products.write'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.json();
    const dataObj = productSchema.parse(body);

    // Get default warehouse
    const { data: whData, error: whError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (whError || !whData) {
      return c.json({ success: false, error: { message: "Gudang utama tidak ditemukan" } }, 400);
    }
    const warehouseId = whData.id;

    // Insert Product
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert({
        business_id: businessId,
        category_id: dataObj.categoryId || null,
        sku: dataObj.sku || null,
        barcode: dataObj.barcode || null,
        name: dataObj.name,
        cost_price: dataObj.costPrice.toString(),
        sell_price: dataObj.sellPrice.toString(),
        min_stock: dataObj.minStock,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Insert Stock
    const { error: stockError } = await supabase
      .from('product_stock')
      .insert({
        product_id: newProduct.id,
        warehouse_id: warehouseId,
        quantity: dataObj.initialStock,
      });

    if (stockError) {
      console.error("Error inserting stock:", stockError);
      // We don't rollback since we are simulating REST transaction, just log it.
    }

    const result = { ...newProduct, stock: dataObj.initialStock };
    return c.json({ success: true, data: keysToCamel(result) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal menyimpan produk");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

productsRoute.get('/:id/barcode', requirePermission('products.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: p, error } = await supabase
      .from('products')
      .select('id, barcode, sku')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !p || (!p.barcode && !p.sku)) {
      return c.json({ success: false, error: { message: "Produk tidak valid untuk barcode" } }, 400);
    }
    
    const text = p.barcode || p.sku || p.id;
    const buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    
    c.header('Content-Type', 'image/png');
    return c.body(buffer as any);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal generate barcode" } }, 400);
  }
});

productsRoute.get('/:id/qrcode', requirePermission('products.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data: p, error } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !p) {
      return c.json({ success: false, error: { message: "Produk tidak ditemukan" } }, 400);
    }
    
    const text = JSON.stringify({ id: p.id, sku: p.sku, name: p.name });
    const buffer = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: text,
      scale: 5,
    });
    
    c.header('Content-Type', 'image/png');
    return c.body(buffer as any);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal generate QR Code" } }, 400);
  }
});
