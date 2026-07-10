import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

const productSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(255),
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  minStock: z.number().min(0).default(5),
  initialStock: z.number().min(0).default(0),
});

type Variables = { businessId: string; userId: string };
export const productsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

productsRoute.use('*', mockAuth);

productsRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const search = c.req.query('search');

  try {
    let query = supabase
      .from('products')
      .select('*, categories(name), product_stock(quantity)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const result = (data || []).map((p: any) => {
      // Calculate total stock without N+1 (since we joined product_stock in the same query)
      const stockArr = p.product_stock || [];
      const totalStock = stockArr.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
      
      const { product_stock: _, categories, category_id, ...rest } = p;
      return {
        ...rest,
        category_id,
        category_name: categories?.name || null,
        stock: totalStock
      };
    });

    return c.json({ success: true, data: keysToCamel(result) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil produk" } }, 500);
  }
});

productsRoute.post('/', async (c) => {
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
      .limit(1);

    if (whError) throw whError;
    if (!whData || whData.length === 0) throw new Error("Gudang utama tidak ditemukan");
    
    const warehouseId = whData[0].id;

    // Supabase REST doesn't support multi-table transactions natively without RPC.
    // We execute sequentially. In production, an RPC is recommended for true ACID.
    const { data: newProdData, error: prodError } = await supabase
      .from('products')
      .insert({
        business_id: businessId,
        category_id: dataObj.categoryId || null,
        sku: dataObj.sku || null,
        barcode: dataObj.barcode || null,
        name: dataObj.name,
        cost_price: dataObj.costPrice,
        sell_price: dataObj.sellPrice,
        min_stock: dataObj.minStock,
      })
      .select();

    if (prodError) throw prodError;
    const newProduct = newProdData[0];

    // Insert stock
    const { error: stockError } = await supabase
      .from('product_stock')
      .insert({
        product_id: newProduct.id,
        warehouse_id: warehouseId,
        quantity: dataObj.initialStock,
      });

    // We ignore stockError for now or handle rollback manually, but keeping simple sequential
    if (stockError) {
       // manual rollback
       await supabase.from('products').delete().eq('id', newProduct.id);
       throw stockError;
    }

    const finalResult = { ...newProduct, stock: dataObj.initialStock };
    return c.json({ success: true, data: keysToCamel(finalResult) }, 201);
  } catch (err: any) {
    const msg = err.issues ? "Input tidak valid" : (err.message || "Gagal menyimpan produk");
    return c.json({ success: false, error: { message: msg } }, 400);
  }
});

productsRoute.get('/:id/barcode', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, barcode, sku')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !data) throw new Error("Produk tidak ditemukan");
    const text = data.barcode || data.sku || data.id;

    // Use external API to avoid binary dependencies in Workers
    const res = await fetch(`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(text)}&scale=3&height=10&includetext=true&textxalign=center`);
    if (!res.ok) throw new Error("Gagal generate barcode");

    const buffer = await res.arrayBuffer();
    return new Response(buffer, { headers: { 'Content-Type': 'image/png' } });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal generate barcode" } }, 400);
  }
});

productsRoute.get('/:id/qrcode', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const id = c.req.param('id');

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, barcode, sku, name')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !data) throw new Error("Produk tidak ditemukan");
    
    const text = JSON.stringify({ id: data.id, sku: data.sku, name: data.name });
    
    const res = await fetch(`https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(text)}&scale=5`);
    if (!res.ok) throw new Error("Gagal generate QR Code");

    const buffer = await res.arrayBuffer();
    return new Response(buffer, { headers: { 'Content-Type': 'image/png' } });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal generate QR Code" } }, 400);
  }
});
