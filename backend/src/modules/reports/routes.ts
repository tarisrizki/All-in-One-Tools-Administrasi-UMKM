import type { FastifyInstance } from 'fastify';
import { query } from '../../plugins/database.js';

export default async function reportRoutes(app: FastifyInstance) {
  app.addHook('preValidation', app.authenticate);

  app.get('/profit-loss', async (request, reply) => {
    try {
      const { businessId } = request.user;
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      
      let dateFilterSales = '';
      const params: unknown[] = [businessId];
      
      if (startDate && endDate) {
         dateFilterSales = ` AND s.created_at >= $2 AND s.created_at <= $3`;
         // sales query doesn't use alias for the first query, let's fix it
         // cashbook uses entry_date which is DATE, created_at is TIMESTAMPTZ
         params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }

      // Calculate Total Revenue from POS Sales
      const salesRes = await query(
        `SELECT COALESCE(SUM(s.grand_total), 0) as total_revenue
         FROM sales s
         WHERE s.business_id = $1 AND s.status != 'void'${dateFilterSales}`,
        params
      );
      const totalRevenue = parseFloat(salesRes.rows[0]?.total_revenue || 0);

      // Calculate Total COGS (Cost of Goods Sold)
      const cogsRes = await query(
        `SELECT COALESCE(SUM(si.qty * p.cost_price), 0) as total_cogs
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         WHERE s.business_id = $1 AND s.status != 'void'${dateFilterSales}`,
        params
      );
      const totalCogs = parseFloat(cogsRes.rows[0]?.total_cogs || 0);

      // Calculate Cashbook Income and Expense
      let dateFilterCashbook = '';
      const paramsCash = [businessId];
      if (startDate && endDate) {
          dateFilterCashbook = ` AND entry_date >= $2 AND entry_date <= $3`;
          paramsCash.push(startDate, endDate);
      }

      const cashbookRes = await query(
        `SELECT type, COALESCE(SUM(amount), 0) as total
         FROM cashbook_entries 
         WHERE business_id = $1${dateFilterCashbook}
         GROUP BY type`,
        paramsCash
      );

      let totalCashIncome = 0;
      let totalCashExpense = 0;

      for (const row of cashbookRes.rows) {
        if (row.type === 'in') {
          totalCashIncome = parseFloat(row.total);
        } else if (row.type === 'out') {
          totalCashExpense = parseFloat(row.total);
        }
      }

      const grossProfit = totalRevenue - totalCogs;
      const netProfit = (grossProfit + totalCashIncome) - totalCashExpense;

      return reply.send({ 
        success: true, 
        data: {
          totalRevenue,
          totalCogs,
          grossProfit,
          totalCashIncome,
          totalCashExpense,
          netProfit
        }
      });
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ success: false, error: { message: 'Gagal menghitung laporan laba rugi' } });
    }
  });

  // Cash Flow Report
  app.get('/cash-flow', async (request, reply) => {
    try {
      const { businessId } = request.user as any;
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      
      const params: unknown[] = [businessId];
      let dateFilterSales = '';
      let dateFilterCashbook = '';
      let dateFilterDebt = '';
      let dateFilterPurchase = '';

      if (startDate && endDate) {
         dateFilterSales = ` AND created_at >= $2 AND created_at <= $3`;
         dateFilterCashbook = ` AND entry_date >= $2 AND entry_date <= $3`;
         dateFilterDebt = ` AND payment_date >= $2 AND payment_date <= $3`;
         dateFilterPurchase = ` AND created_at >= $2 AND created_at <= $3`;
         params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }

      // Cash In: POS Sales
      const salesRes = await query(`SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE business_id = $1 AND status != 'void'${dateFilterSales}`, params);
      const totalSalesIn = parseFloat(salesRes.rows[0]?.total || 0);

      // Cash In: Cashbook In
      const cashbookInRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM cashbook_entries WHERE business_id = $1 AND type = 'in'${dateFilterCashbook}`, params);
      const totalCashbookIn = parseFloat(cashbookInRes.rows[0]?.total || 0);

      // Cash In: Piutang Pelanggan (Receivable) dibayar
      const receivableRes = await query(`
        SELECT COALESCE(SUM(dp.amount), 0) as total 
        FROM debt_payments dp 
        JOIN debts d ON dp.debt_id = d.id 
        WHERE d.business_id = $1 AND d.type = 'receivable'${dateFilterDebt.replace(/payment_date/g, 'dp.payment_date')}
      `, params);
      const totalReceivableIn = parseFloat(receivableRes.rows[0]?.total || 0);

      // Cash Out: Purchases (Beli ke supplier)
      const purchaseRes = await query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE business_id = $1${dateFilterPurchase}`, params);
      const totalPurchaseOut = parseFloat(purchaseRes.rows[0]?.total || 0);

      // Cash Out: Cashbook Out
      const cashbookOutRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM cashbook_entries WHERE business_id = $1 AND type = 'out'${dateFilterCashbook}`, params);
      const totalCashbookOut = parseFloat(cashbookOutRes.rows[0]?.total || 0);

      // Cash Out: Hutang (Payable) dibayar
      const payableRes = await query(`
        SELECT COALESCE(SUM(dp.amount), 0) as total 
        FROM debt_payments dp 
        JOIN debts d ON dp.debt_id = d.id 
        WHERE d.business_id = $1 AND d.type = 'payable'${dateFilterDebt.replace(/payment_date/g, 'dp.payment_date')}
      `, params);
      const totalPayableOut = parseFloat(payableRes.rows[0]?.total || 0);

      const totalCashIn = totalSalesIn + totalCashbookIn + totalReceivableIn;
      const totalCashOut = totalPurchaseOut + totalCashbookOut + totalPayableOut;
      const netCashFlow = totalCashIn - totalCashOut;

      return reply.send({ 
        success: true, 
        data: {
          cashIn: {
             sales: totalSalesIn,
             cashbook: totalCashbookIn,
             receivable: totalReceivableIn,
             total: totalCashIn
          },
          cashOut: {
             purchases: totalPurchaseOut,
             cashbook: totalCashbookOut,
             payable: totalPayableOut,
             total: totalCashOut
          },
          netCashFlow
        }
      });
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ success: false, error: { message: 'Gagal menghitung laporan arus kas' } });
    }
  });

  // Dashboard Metrics
  app.get('/dashboard', async (request, reply) => {
    try {
      const { businessId } = request.user as any;
      const tzOffset = '+07:00'; // Defaulting to WIB for today's calculation or use simple db dates
      
      // Today metrics
      const todayRes = await query(`
        SELECT COALESCE(SUM(grand_total), 0) as today_sales, COUNT(id) as today_transactions
        FROM sales 
        WHERE business_id = $1 AND status != 'void' AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
      `, [businessId]);
      
      const todaySales = parseFloat(todayRes.rows[0]?.today_sales || 0);
      const todayTransactions = parseInt(todayRes.rows[0]?.today_transactions || 0);

      // Last 7 days metrics
      const weeklyRes = await query(`
        SELECT DATE(created_at AT TIME ZONE 'Asia/Jakarta') as sale_date, COALESCE(SUM(grand_total), 0) as daily_total
        FROM sales
        WHERE business_id = $1 AND status != 'void' AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jakarta')
        ORDER BY sale_date ASC
      `, [businessId]);

      const weeklyData = weeklyRes.rows.map(r => ({
          date: r.sale_date,
          total: parseFloat(r.daily_total)
      }));

      return reply.send({ 
        success: true, 
        data: {
           todaySales,
           todayTransactions,
           weeklyData
        }
      });
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ success: false, error: { message: 'Gagal mengambil data dashboard' } });
    }
  });
}
