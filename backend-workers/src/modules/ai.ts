import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';

type Variables = { businessId: string; userId: string };
export const aiRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

aiRoute.use('*', mockAuth);

aiRoute.get('/predictions', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Get stock and sales
    const { data: salesData } = await supabase.from('sales').select('id, grand_total').eq('business_id', businessId).neq('status', 'void').gte('created_at', `${startDateStr}T00:00:00.000Z`);
    
    const saleIds = (salesData || []).map((s: any) => s.id);
    const { data: productsData } = await supabase.from('products').select('id, name, product_stock(quantity)').eq('business_id', businessId);
    
    const prodMap = new Map();
    (productsData || []).forEach((p: any) => {
      const stock = (p.product_stock || []).reduce((sum: number, st: any) => sum + Number(st.quantity || 0), 0);
      prodMap.set(p.id, { name: p.name, currentStock: stock, totalSold: 0 });
    });

    if (saleIds.length > 0) {
      const { data: itemsData } = await supabase.from('sale_items').select('product_id, qty').in('sale_id', saleIds);
      (itemsData || []).forEach((item: any) => {
        if (prodMap.has(item.product_id)) {
          prodMap.get(item.product_id).totalSold += item.qty;
        }
      });
    }

    const stockPredictions = Array.from(prodMap.values())
      .filter(p => p.totalSold > 0)
      .map(item => {
        const dailyVelocity = item.totalSold / 30;
        const daysToEmpty = dailyVelocity > 0 ? (item.currentStock / dailyVelocity) : 999;
        return {
          ...item,
          dailyVelocity,
          daysToEmpty,
          status: daysToEmpty < 7 ? 'critical' : (daysToEmpty < 14 ? 'warning' : 'safe')
        };
      })
      .filter(p => p.status !== 'safe')
      .sort((a, b) => a.daysToEmpty - b.daysToEmpty);

    // Sales prediction
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const s1 = sevenDaysAgo.toISOString().split("T")[0];
    const s2 = fourteenDaysAgo.toISOString().split("T")[0];

    const last7Sales = (salesData || [])
      .filter((s: any) => s.created_at >= `${s1}T00:00:00.000Z`)
      .reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);

    const { data: prev7SalesData } = await supabase.from('sales').select('grand_total').eq('business_id', businessId).neq('status', 'void')
      .gte('created_at', `${s2}T00:00:00.000Z`)
      .lte('created_at', `${s1}T23:59:59.999Z`);
      
    const prev7Sales = (prev7SalesData || []).reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);

    let growthRate = 0;
    if (prev7Sales > 0) growthRate = (last7Sales - prev7Sales) / prev7Sales;

    const projected30Days = (last7Sales / 7) * 30 * (1 + (growthRate > 0.5 ? 0.5 : growthRate));

    return c.json({
      success: true,
      data: keysToCamel({
        stockAlerts: stockPredictions,
        salesProjection: {
          last7Days: last7Sales,
          prev7Days: prev7Sales,
          growthRate: growthRate * 100,
          projectedNext30Days: Math.round(projected30Days)
        }
      })
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung prediksi AI" } }, 500);
  }
});

aiRoute.get('/summary', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split("T")[0];

    const { data: salesData } = await supabase.from('sales').select('id, grand_total').eq('business_id', businessId).neq('status', 'void').gte('created_at', `${startDate}T00:00:00.000Z`);
    const totalRevenue = (salesData || []).reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const saleIds = (salesData || []).map((s: any) => s.id);

    const { data: debtData } = await supabase.from('debts').select('remaining_amount').eq('business_id', businessId).eq('type', 'piutang').eq('status', 'unpaid');
    const totalReceivables = (debtData || []).reduce((sum: number, d: any) => sum + Number(d.remaining_amount || 0), 0);

    let topProducts = [];
    if (saleIds.length > 0) {
      const { data: itemsData } = await supabase.from('sale_items').select('qty, products(name)').in('sale_id', saleIds);
      const prodMap = new Map();
      (itemsData || []).forEach((item: any) => {
        const name = item.products?.name || 'Unknown';
        prodMap.set(name, (prodMap.get(name) || 0) + item.qty);
      });
      topProducts = Array.from(prodMap.entries()).map(([name, sold]) => ({ name, sold })).sort((a, b) => b.sold - a.sold).slice(0, 2);
    }

    let productText = "Belum ada data produk terjual minggu ini.";
    if (topProducts.length > 0) {
      productText = `Produk terlaris adalah ${topProducts.map(p => p.name).join(' dan ')}.`;
    }

    const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    const summary = `Pendapatan minggu ini mencapai **${formatRupiah(totalRevenue)}**. ${productText} Total tagihan kasbon yang belum lunas sebesar **${formatRupiah(totalReceivables)}**.`;

    return c.json({ success: true, data: keysToCamel({ summary }) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal membuat ringkasan" } }, 500);
  }
});

aiRoute.post('/chat', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const body = await c.req.json();
    const message = body.message?.toLowerCase() || '';
    let response = "Maaf, saya belum mengerti. Anda bisa bertanya tentang **stok**, **omzet** (penjualan), atau **piutang** (kasbon).";

    const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

    if (message.includes("stok")) {
      const { data: productsData } = await supabase.from('products').select('name, product_stock(quantity)').eq('business_id', businessId);
      const lowStock = (productsData || [])
        .map((p: any) => {
          const stock = (p.product_stock || []).reduce((sum: number, st: any) => sum + Number(st.quantity || 0), 0);
          return { name: p.name, stock };
        })
        .filter(p => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);

      if (lowStock.length > 0) {
        response = "Ini daftar beberapa produk dengan stok menipis (<= 5):\n" + 
          lowStock.map(p => `- ${p.name}: **${p.stock}** tersisa`).join("\n") +
          "\n\nJangan lupa segera restock ya!";
      } else {
        response = "Stok barang Anda semuanya masih dalam kondisi aman (>5).";
      }
    } else if (message.includes("omzet") || message.includes("penjualan") || message.includes("pendapatan")) {
      const today = new Date().toISOString().split("T")[0];
      const { data: salesData } = await supabase.from('sales').select('grand_total').eq('business_id', businessId).neq('status', 'void').gte('created_at', `${today}T00:00:00.000Z`);
      const total = (salesData || []).reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
      response = `Omzet Anda hari ini adalah **${formatRupiah(total)}**.`;
    } else if (message.includes("piutang") || message.includes("kasbon") || message.includes("hutang")) {
      const { data: debtData } = await supabase.from('debts').select('remaining_amount').eq('business_id', businessId).eq('type', 'piutang').eq('status', 'unpaid');
      const total = (debtData || []).reduce((sum: number, d: any) => sum + Number(d.remaining_amount || 0), 0);
      response = `Total tagihan piutang (kasbon pelanggan) yang belum dibayar saat ini adalah **${formatRupiah(total)}**.`;
    }

    return c.json({ success: true, data: keysToCamel({ response }) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal memproses chat AI" } }, 500);
  }
});
