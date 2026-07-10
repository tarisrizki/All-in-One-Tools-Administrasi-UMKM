import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';

type Variables = { businessId: string; userId: string; roleId: string };
export const reportsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

reportsRoute.use('*', authMiddleware);

reportsRoute.get('/profit-loss', requirePermission('reports.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    let salesQuery = supabase.from('sales').select('grand_total, id').eq('business_id', businessId).neq('status', 'void');
    let cashbookQuery = supabase.from('cashbook_entries').select('type, amount').eq('business_id', businessId);
    let itemsQuery = supabase.from('sale_items').select('qty, sales!inner(business_id, status, created_at, id), products(cost_price)').eq('sales.business_id', businessId).neq('sales.status', 'void');

    if (startDate && endDate) {
      salesQuery = salesQuery.gte('created_at', `${startDate} 00:00:00`).lte('created_at', `${endDate} 23:59:59`);
      cashbookQuery = cashbookQuery.gte('entry_date', startDate).lte('entry_date', endDate);
      itemsQuery = itemsQuery.gte('sales.created_at', `${startDate} 00:00:00`).lte('sales.created_at', `${endDate} 23:59:59`);
    }

    const [salesRes, cashbookRes, itemsRes] = await Promise.all([
      salesQuery,
      cashbookQuery,
      itemsQuery
    ]);

    if (salesRes.error) throw salesRes.error;
    if (cashbookRes.error) throw cashbookRes.error;
    if (itemsRes.error) throw itemsRes.error;

    let totalRevenue = 0;
    for (const s of salesRes.data || []) totalRevenue += parseFloat(s.grand_total);

    let totalCogs = 0;
    for (const item of itemsRes.data || []) {
      totalCogs += item.qty * parseFloat((item as any).products?.cost_price || '0');
    }

    let totalCashIncome = 0;
    let totalCashExpense = 0;
    for (const entry of cashbookRes.data || []) {
      if (entry.type === 'in') totalCashIncome += parseFloat(entry.amount);
      else if (entry.type === 'out') totalCashExpense += parseFloat(entry.amount);
    }

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit + totalCashIncome - totalCashExpense;

    return c.json({
      success: true,
      data: keysToCamel({ totalRevenue, totalCogs, grossProfit, totalCashIncome, totalCashExpense, netProfit })
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan laba rugi" } }, 500);
  }
});

reportsRoute.get('/cash-flow', requirePermission('reports.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    let salesQuery = supabase.from('sales').select('grand_total').eq('business_id', businessId).neq('status', 'void');
    let cashbookQuery = supabase.from('cashbook_entries').select('type, amount').eq('business_id', businessId);
    let debtsQuery = supabase.from('debt_payments').select('amount, debts!inner(business_id, type)').eq('debts.business_id', businessId);
    let purchasesQuery = supabase.from('purchase_orders').select('total_amount').eq('business_id', businessId);

    if (startDate && endDate) {
      salesQuery = salesQuery.gte('created_at', `${startDate} 00:00:00`).lte('created_at', `${endDate} 23:59:59`);
      cashbookQuery = cashbookQuery.gte('entry_date', startDate).lte('entry_date', endDate);
      debtsQuery = debtsQuery.gte('payment_date', startDate).lte('payment_date', endDate);
      purchasesQuery = purchasesQuery.gte('created_at', `${startDate} 00:00:00`).lte('created_at', `${endDate} 23:59:59`);
    }

    const [salesRes, cashbookRes, debtsRes, purchasesRes] = await Promise.all([salesQuery, cashbookQuery, debtsQuery, purchasesQuery]);

    let totalSalesIn = 0;
    for (const s of salesRes.data || []) totalSalesIn += parseFloat(s.grand_total);

    let totalCashbookIn = 0, totalCashbookOut = 0;
    for (const entry of cashbookRes.data || []) {
      if (entry.type === 'in') totalCashbookIn += parseFloat(entry.amount);
      else if (entry.type === 'out') totalCashbookOut += parseFloat(entry.amount);
    }

    let totalReceivableIn = 0, totalPayableOut = 0;
    for (const p of debtsRes.data || []) {
      const debtType = (p as any).debts?.type;
      if (debtType === 'receivable' || debtType === 'piutang') totalReceivableIn += parseFloat(p.amount);
      if (debtType === 'payable' || debtType === 'hutang') totalPayableOut += parseFloat(p.amount);
    }

    let totalPurchaseOut = 0;
    for (const po of purchasesRes.data || []) totalPurchaseOut += parseFloat(po.total_amount);

    const totalCashIn = totalSalesIn + totalCashbookIn + totalReceivableIn;
    const totalCashOut = totalPurchaseOut + totalCashbookOut + totalPayableOut;
    const netCashFlow = totalCashIn - totalCashOut;

    return c.json({
      success: true,
      data: keysToCamel({
        cashIn: { sales: totalSalesIn, cashbook: totalCashbookIn, receivable: totalReceivableIn, total: totalCashIn },
        cashOut: { purchases: totalPurchaseOut, cashbook: totalCashbookOut, payable: totalPayableOut, total: totalCashOut },
        netCashFlow
      })
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan arus kas" } }, 500);
  }
});

reportsRoute.get('/sales', requirePermission('reports.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    let salesQuery = supabase.from('sales').select('grand_total, id').eq('business_id', businessId).neq('status', 'void');
    let itemsQuery = supabase.from('sale_items').select('qty, price, products(id, name), sales!inner(business_id, status, created_at)').eq('sales.business_id', businessId).neq('sales.status', 'void');

    if (startDate && endDate) {
      salesQuery = salesQuery.gte('created_at', `${startDate} 00:00:00`).lte('created_at', `${endDate} 23:59:59`);
      itemsQuery = itemsQuery.gte('sales.created_at', `${startDate} 00:00:00`).lte('sales.created_at', `${endDate} 23:59:59`);
    }

    const [salesRes, itemsRes] = await Promise.all([salesQuery, itemsQuery]);

    let totalRevenue = 0;
    for (const s of salesRes.data || []) totalRevenue += parseFloat(s.grand_total);
    const totalTransactions = (salesRes.data || []).length;

    const productStats = new Map<string, { name: string, qty: number, revenue: number }>();
    
    for (const item of itemsRes.data || []) {
      const prodId = (item as any).products?.id;
      const prodName = (item as any).products?.name || 'Unknown';
      if (!prodId) continue;

      const qty = item.qty;
      const rev = qty * parseFloat(item.price);
      
      if (!productStats.has(prodId)) {
        productStats.set(prodId, { name: prodName, qty, revenue: rev });
      } else {
        const stat = productStats.get(prodId)!;
        stat.qty += qty;
        stat.revenue += rev;
      }
    }

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return c.json({ success: true, data: keysToCamel({ totalRevenue, totalTransactions, topProducts }) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan penjualan" } }, 500);
  }
});

reportsRoute.get('/inventory', requirePermission('reports.read'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const { data: stockData, error } = await supabase
      .from('product_stock')
      .select('quantity, products!inner(business_id, name, min_stock, cost_price)')
      .eq('products.business_id', businessId);

    if (error) throw error;

    let totalStockValue = 0;
    const lowStock: any[] = [];

    for (const stock of stockData || []) {
      const qty = stock.quantity;
      const p = (stock as any).products;
      const costPrice = parseFloat(p.cost_price);
      
      totalStockValue += qty * costPrice;

      if (qty <= p.min_stock) {
        lowStock.push({
          name: p.name,
          stock: qty,
          min_stock: p.min_stock
        });
      }
    }

    lowStock.sort((a, b) => a.stock - b.stock);

    return c.json({ success: true, data: keysToCamel({ totalStockValue, lowStock }) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan inventori" } }, 500);
  }
});

reportsRoute.get('/dashboard', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    // Current date logic might slightly drift depending on timezone in JS vs Postgres,
    // but for simple approximation in Workers without full raw SQL:
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgo = sevenDaysAgoDate.toISOString();

    const [todayRes, weeklyRes] = await Promise.all([
      supabase.from('sales').select('grand_total').eq('business_id', businessId).neq('status', 'void').gte('created_at', `${today} 00:00:00`),
      supabase.from('sales').select('grand_total, created_at').eq('business_id', businessId).neq('status', 'void').gte('created_at', sevenDaysAgo)
    ]);

    let todaySales = 0;
    for (const s of todayRes.data || []) todaySales += parseFloat(s.grand_total);
    const todayTransactions = (todayRes.data || []).length;

    const dailyMap = new Map<string, number>();
    for (const s of weeklyRes.data || []) {
      // Very naive timezone extraction (UTC)
      const dateStr = s.created_at.split('T')[0];
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + parseFloat(s.grand_total));
    }

    const weeklyData = Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total }));
    weeklyData.sort((a, b) => a.date.localeCompare(b.date));

    return c.json({ success: true, data: keysToCamel({ todaySales, todayTransactions, weeklyData }) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data dashboard" } }, 500);
  }
});

reportsRoute.get('/export', requirePermission('reports.read'), async (c) => {
  return c.json({ success: false, error: { message: "Fitur export laporan belum didukung di Workers" } }, 501);
});
