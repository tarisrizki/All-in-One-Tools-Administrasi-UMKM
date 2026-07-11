import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';
import bwipjs from 'bwip-js';

const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(255).openapi({ example: 'Kopi Susu' }),
  categoryId: z.string().uuid().nullable().optional().openapi({ example: null }),
  sku: z.string().max(100).nullable().optional().openapi({ example: 'SKU-001' }),
  barcode: z.string().max(100).nullable().optional().openapi({ example: 'BC-001' }),
  costPrice: z.number().min(0).openapi({ example: 8000 }),
  sellPrice: z.number().min(0).openapi({ example: 15000 }),
  minStock: z.number().min(0).default(5).openapi({ example: 5 }),
  initialStock: z.number().min(0).default(0).openapi({ example: 100 }),
});

const productResponseSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  costPrice: z.number().or(z.string()),
  sellPrice: z.number().or(z.string()),
  minStock: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categoryName: z.string().nullable().optional(),
  stock: z.number()
}).passthrough();

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Products'],
  description: 'Mendapatkan daftar produk',
  request: {
    query: z.object({
      search: z.string().optional()
    })
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.array(productResponseSchema)) } },
      description: 'Daftar produk',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  }
});

const createRouteDef = createRoute({
  method: 'post',
  path: '/',
  tags: ['Products'],
  description: 'Membuat produk baru',
  request: {
    body: {
      content: { 'application/json': { schema: productSchema } }
    }
  },
  responses: {
    201: {
      content: { 'application/json': { schema: createSuccessSchema(productResponseSchema) } },
      description: 'Produk berhasil dibuat',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Input tidak valid',
    },
    403: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Batas paket gratis tercapai',
    }
  }
});

const barcodeRoute = createRoute({
  method: 'get',
  path: '/{id}/barcode',
  tags: ['Products'],
  description: 'Mendapatkan barcode produk',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'image/png': { schema: z.string().openapi({ type: 'string', format: 'binary' }) } },
      description: 'Gambar barcode'
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Gagal generate barcode'
    }
  }
});

const qrcodeRoute = createRoute({
  method: 'get',
  path: '/{id}/qrcode',
  tags: ['Products'],
  description: 'Mendapatkan QR Code produk',
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      content: { 'image/png': { schema: z.string().openapi({ type: 'string', format: 'binary' }) } },
      description: 'Gambar QR Code'
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Gagal generate QR Code'
    }
  }
});

type Variables = { businessId: string; userId: string; roleId: string };
export const productsRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

productsRoute.use('*', authMiddleware);

productsRoute.get('/', requirePermission('products.read'));
productsRoute.openapi(listRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { search } = c.req.valid('query');

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

    return c.json({ success: true, data: keysToCamel(result) }, 200);
  } catch (err: any) {
    console.error("Products GET error:", err);
    return c.json({ success: false, error: { message: "Gagal mengambil produk" } }, 500);
  }
});

productsRoute.post('/', requirePermission('products.write'));
productsRoute.openapi(createRouteDef, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const dataObj = c.req.valid('json');

    // Validate quota: max 500 products
    const { count: productCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    
    if (countError) throw countError;
    if (productCount !== null && productCount >= 500) {
      return c.json({ success: false, error: { message: "Batas paket gratis (500 item) sudah tercapai" } }, 403);
    }

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

    // Validate category
    if (dataObj.categoryId) {
      const { data: cat, error: catErr } = await supabase.from('categories').select('id').eq('id', dataObj.categoryId).eq('business_id', businessId).single();
      if (catErr || !cat) throw new Error("Kategori tidak valid atau bukan milik bisnis ini");
    }

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

productsRoute.get('/:id/barcode', requirePermission('products.read'));
productsRoute.openapi(barcodeRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

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
    return c.body(buffer as any, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal generate barcode" } }, 400);
  }
});

productsRoute.get('/:id/qrcode', requirePermission('products.read'));
productsRoute.openapi(qrcodeRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { id } = c.req.valid('param');

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
    return c.body(buffer as any, 200);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal generate QR Code" } }, 400);
  }
});
