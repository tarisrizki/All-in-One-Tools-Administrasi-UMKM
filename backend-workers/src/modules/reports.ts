import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { z } from 'zod';

type Variables = { businessId: string; userId: string };
export const reportsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

reportsRoute.use('*', mockAuth);

const exportQuerySchema = z.object({
  tab: z.enum(['profit-loss', 'cash-flow', 'sales', 'inventory']),
  format: z.enum(['pdf', 'excel']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Helper for date filtering in Supabase
function applyDateFilter(query: any, column: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    // For exact match inclusive of time, ensure proper bounds
    query = query.gte(column, `${startDate}T00:00:00.000Z`).lte(column, `${endDate}T23:59:59.999Z`);
  }
  return query;
}

// Logic ported from Phase 2 (reports/service.ts) using Supabase JS client
async function getProfitLoss(supabase: any, businessId: string, range?: { startDate?: string; endDate?: string }) {
  // 1. Sales
  let salesQ = supabase.from('sales').select('id, grand_total').eq('business_id', businessId).neq('status', 'void');
  salesQ = applyDateFilter(salesQ, 'created_at', range?.startDate, range?.endDate);
  const { data: salesData } = await salesQ;
  
  const totalRevenue = (salesData || []).reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
  const saleIds = (salesData || []).map((s: any) => s.id);

  // 2. COGS (from sale_items & products)
  let totalCogs = 0;
  if (saleIds.length > 0) {
    const { data: cogsData } = await supabase.from('sale_items').select('qty, products(cost_price)').in('sale_id', saleIds);
    totalCogs = (cogsData || []).reduce((sum: number, item: any) => sum + (item.qty * Number(item.products?.cost_price || 0)), 0);
  }

  // 3. Cashbook
  let cbQ = supabase.from('cashbook_entries').select('type, amount').eq('business_id', businessId);
  cbQ = applyDateFilter(cbQ, 'entry_date', range?.startDate, range?.endDate);
  const { data: cbData } = await cbQ;
  
  let totalCashIncome = 0;
  let totalCashExpense = 0;
  for (const row of (cbData || [])) {
    if (row.type === 'in') totalCashIncome += Number(row.amount || 0);
    else if (row.type === 'out') totalCashExpense += Number(row.amount || 0);
  }

  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit + totalCashIncome - totalCashExpense;

  return { totalRevenue, totalCogs, grossProfit, totalCashIncome, totalCashExpense, netProfit };
}

async function getCashFlow(supabase: any, businessId: string, range?: { startDate?: string; endDate?: string }) {
  let salesQ = supabase.from('sales').select('grand_total').eq('business_id', businessId).neq('status', 'void');
  salesQ = applyDateFilter(salesQ, 'created_at', range?.startDate, range?.endDate);
  const { data: salesData } = await salesQ;
  const totalSalesIn = (salesData || []).reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);

  let cbInQ = supabase.from('cashbook_entries').select('amount').eq('business_id', businessId).eq('type', 'in');
  cbInQ = applyDateFilter(cbInQ, 'entry_date', range?.startDate, range?.endDate);
  const { data: cbInData } = await cbInQ;
  const totalCashbookIn = (cbInData || []).reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  let cbOutQ = supabase.from('cashbook_entries').select('amount').eq('business_id', businessId).eq('type', 'out');
  cbOutQ = applyDateFilter(cbOutQ, 'entry_date', range?.startDate, range?.endDate);
  const { data: cbOutData } = await cbOutQ;
  const totalCashbookOut = (cbOutData || []).reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  let purchQ = supabase.from('purchase_orders').select('total_amount').eq('business_id', businessId);
  purchQ = applyDateFilter(purchQ, 'created_at', range?.startDate, range?.endDate);
  const { data: purchData } = await purchQ;
  const totalPurchaseOut = (purchData || []).reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);

  // Debts
  let receivableQ = supabase.from('debts').select('id').eq('business_id', businessId).eq('type', 'piutang');
  let payableQ = supabase.from('debts').select('id').eq('business_id', businessId).eq('type', 'hutang');
  
  const [receivableRes, payableRes] = await Promise.all([receivableQ, payableQ]);
  const recIds = (receivableRes.data || []).map((d: any) => d.id);
  const payIds = (payableRes.data || []).map((d: any) => d.id);

  let totalReceivableIn = 0;
  if (recIds.length > 0) {
    let recPayQ = supabase.from('debt_payments').select('amount').in('debt_id', recIds);
    recPayQ = applyDateFilter(recPayQ, 'payment_date', range?.startDate, range?.endDate);
    const { data: dp } = await recPayQ;
    totalReceivableIn = (dp || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }

  let totalPayableOut = 0;
  if (payIds.length > 0) {
    let payPayQ = supabase.from('debt_payments').select('amount').in('debt_id', payIds);
    payPayQ = applyDateFilter(payPayQ, 'payment_date', range?.startDate, range?.endDate);
    const { data: pp } = await payPayQ;
    totalPayableOut = (pp || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }

  const totalCashIn = totalSalesIn + totalCashbookIn + totalReceivableIn;
  const totalCashOut = totalPurchaseOut + totalCashbookOut + totalPayableOut;
  const netCashFlow = totalCashIn - totalCashOut;

  return {
    cashIn: { sales: totalSalesIn, cashbook: totalCashbookIn, receivable: totalReceivableIn, total: totalCashIn },
    cashOut: { purchases: totalPurchaseOut, cashbook: totalCashbookOut, payable: totalPayableOut, total: totalCashOut },
    netCashFlow
  };
}

async function getSalesReport(supabase: any, businessId: string, range?: { startDate?: string; endDate?: string }) {
  let salesQ = supabase.from('sales').select('id, grand_total').eq('business_id', businessId).neq('status', 'void');
  salesQ = applyDateFilter(salesQ, 'created_at', range?.startDate, range?.endDate);
  const { data: salesData } = await salesQ;
  
  const totalRevenue = (salesData || []).reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
  const totalTransactions = (salesData || []).length;
  const saleIds = (salesData || []).map((s: any) => s.id);

  let topProducts = [];
  if (saleIds.length > 0) {
    const { data: itemsData } = await supabase.from('sale_items').select('qty, price, product_id, products(name)').in('sale_id', saleIds);
    const prodMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of (itemsData || [])) {
      const pid = item.product_id;
      const exist = prodMap.get(pid) || { name: item.products?.name || '', qty: 0, revenue: 0 };
      exist.qty += item.qty;
      exist.revenue += item.qty * Number(item.price || 0);
      prodMap.set(pid, exist);
    }
    topProducts = Array.from(prodMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }

  return { totalRevenue, totalTransactions, topProducts };
}

async function getInventoryReport(supabase: any, businessId: string) {
  const { data: prods } = await supabase.from('products').select('id, name, min_stock, cost_price, product_stock(quantity)').eq('business_id', businessId);
  
  let totalStockValue = 0;
  const inventoryItems = [];
  const lowStock = [];

  for (const p of (prods || [])) {
    const stockQty = (p.product_stock || []).reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
    const val = stockQty * Number(p.cost_price || 0);
    totalStockValue += val;
    
    inventoryItems.push({
      name: p.name,
      stock: stockQty,
      minStock: p.min_stock,
      value: val
    });

    if (stockQty <= p.min_stock) {
      lowStock.push({ name: p.name, stock: stockQty, minStock: p.min_stock });
    }
  }

  lowStock.sort((a, b) => a.stock - b.stock);
  inventoryItems.sort((a, b) => a.name.localeCompare(b.name));

  return { totalStockValue, lowStock, inventoryItems };
}


reportsRoute.get('/profit-loss', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  try {
    const data = await getProfitLoss(supabase, businessId, { startDate, endDate });
    return c.json({ success: true, data: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan laba rugi" } }, 500);
  }
});

reportsRoute.get('/cash-flow', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  try {
    const data = await getCashFlow(supabase, businessId, { startDate, endDate });
    return c.json({ success: true, data: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan arus kas" } }, 500);
  }
});

reportsRoute.get('/sales', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  try {
    const data = await getSalesReport(supabase, businessId, { startDate, endDate });
    return c.json({ success: true, data: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan penjualan" } }, 500);
  }
});

reportsRoute.get('/inventory', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  try {
    const data = await getInventoryReport(supabase, businessId);
    return c.json({ success: true, data: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal menghitung laporan inventori" } }, 500);
  }
});

reportsRoute.get('/dashboard', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  try {
    // 1. Today sales & transactions
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayData } = await supabase.from('sales').select('grand_total, created_at')
      .eq('business_id', businessId)
      .neq('status', 'void')
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`);
      
    const todaySales = (todayData || []).reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const todayTransactions = (todayData || []).length;

    // 2. Weekly Data
    const dateList = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dateList.push(d.toISOString().split('T')[0]);
    }

    const { data: weeklyRaw } = await supabase.from('sales').select('grand_total, created_at')
      .eq('business_id', businessId)
      .neq('status', 'void')
      .gte('created_at', `${dateList[0]}T00:00:00.000Z`)
      .lte('created_at', `${dateList[6]}T23:59:59.999Z`);

    const weeklyMap = new Map<string, number>();
    dateList.forEach(d => weeklyMap.set(d, 0));

    (weeklyRaw || []).forEach((s: any) => {
      const dateKey = s.created_at.split('T')[0];
      if (weeklyMap.has(dateKey)) {
        weeklyMap.set(dateKey, weeklyMap.get(dateKey)! + Number(s.grand_total || 0));
      }
    });

    const weeklyData = dateList.map(d => ({
      date: d,
      total: weeklyMap.get(d)
    }));

    return c.json({ success: true, data: keysToCamel({ todaySales, todayTransactions, weeklyData }) });
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Gagal mengambil data dashboard" } }, 500);
  }
});

reportsRoute.get('/export', async (c) => {
  try {
    const { tab, format, startDate, endDate } = exportQuerySchema.parse(c.req.query());
    // Di Worker, mengenerate PDF/Excel dengan pustaka node native tidak didukung secara langsung,
    // Kita return 501 sebagai mock export.
    return c.json({ success: false, error: { message: `Export to ${format} belum diimplementasikan di Cloudflare Workers` } }, 501);
  } catch (err: any) {
    return c.json({ success: false, error: { message: "Parameter tab dan format diperlukan atau tidak valid" } }, 400);
  }
});
