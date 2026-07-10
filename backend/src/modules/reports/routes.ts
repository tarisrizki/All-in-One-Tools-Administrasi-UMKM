import type { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { sales, saleItems, products, cashbookEntries, debtPayments, debts, purchaseOrders, productStock } from "../../db/schema.js";
import { eq, and, sql, gte, lte, ne } from "drizzle-orm";

export default async function reportRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.get("/profit-loss", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			const { startDate, endDate } = request.query as {
				startDate?: string;
				endDate?: string;
			};

			let dateFilterSales = sql`1=1`;
			let dateFilterCashbook = sql`1=1`;

			if (startDate && endDate) {
				dateFilterSales = and(gte(sales.createdAt, `${startDate} 00:00:00`), lte(sales.createdAt, `${endDate} 23:59:59`)) as any;
				dateFilterCashbook = and(gte(cashbookEntries.entryDate, startDate), lte(cashbookEntries.entryDate, endDate)) as any;
			}

			// Total Revenue
			const salesRes = await db.select({
				total_revenue: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)`
			}).from(sales).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
			const totalRevenue = parseFloat(salesRes[0]?.total_revenue as any || 0);

			// Total COGS
			const cogsRes = await db.select({
				total_cogs: sql`COALESCE(SUM(${saleItems.qty} * CAST(${products.costPrice} AS NUMERIC)), 0)`
			}).from(saleItems)
			  .innerJoin(sales, eq(saleItems.saleId, sales.id))
			  .innerJoin(products, eq(saleItems.productId, products.id))
			  .where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
			const totalCogs = parseFloat(cogsRes[0]?.total_cogs as any || 0);

			// Cashbook
			const cashbookRes = await db.select({
				type: cashbookEntries.type,
				total: sql`COALESCE(SUM(CAST(${cashbookEntries.amount} AS NUMERIC)), 0)`
			}).from(cashbookEntries).where(and(eq(cashbookEntries.businessId, businessId), dateFilterCashbook)).groupBy(cashbookEntries.type);

			let totalCashIncome = 0;
			let totalCashExpense = 0;
			for (const row of cashbookRes) {
				if (row.type === "in") totalCashIncome = parseFloat(row.total as any);
				else if (row.type === "out") totalCashExpense = parseFloat(row.total as any);
			}

			const grossProfit = totalRevenue - totalCogs;
			const netProfit = grossProfit + totalCashIncome - totalCashExpense;

			return reply.send({
				success: true,
				data: { totalRevenue, totalCogs, grossProfit, totalCashIncome, totalCashExpense, netProfit },
			});
		} catch (err: unknown) {
			app.log.error(err);
			return reply.status(500).send({ success: false, error: { message: "Gagal menghitung laporan laba rugi" } });
		}
	});

	app.get("/cash-flow", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user as any;
			const { startDate, endDate } = request.query as {
				startDate?: string;
				endDate?: string;
			};

			let dateFilterSales = sql`1=1`;
			let dateFilterCashbook = sql`1=1`;
			let dateFilterDebt = sql`1=1`;
			let dateFilterPurchase = sql`1=1`;

			if (startDate && endDate) {
				dateFilterSales = and(gte(sales.createdAt, `${startDate} 00:00:00`), lte(sales.createdAt, `${endDate} 23:59:59`)) as any;
				dateFilterCashbook = and(gte(cashbookEntries.entryDate, startDate), lte(cashbookEntries.entryDate, endDate)) as any;
				dateFilterDebt = and(gte(debtPayments.paymentDate, startDate), lte(debtPayments.paymentDate, endDate)) as any;
				dateFilterPurchase = and(gte(purchaseOrders.createdAt, `${startDate} 00:00:00`), lte(purchaseOrders.createdAt, `${endDate} 23:59:59`)) as any;
			}

			const salesRes = await db.select({ total: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)` }).from(sales).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
			const totalSalesIn = parseFloat(salesRes[0]?.total as any || 0);

			const cashbookInRes = await db.select({ total: sql`COALESCE(SUM(CAST(${cashbookEntries.amount} AS NUMERIC)), 0)` }).from(cashbookEntries).where(and(eq(cashbookEntries.businessId, businessId), eq(cashbookEntries.type, 'in'), dateFilterCashbook));
			const totalCashbookIn = parseFloat(cashbookInRes[0]?.total as any || 0);

			const receivableRes = await db.select({ total: sql`COALESCE(SUM(CAST(${debtPayments.amount} AS NUMERIC)), 0)` }).from(debtPayments).innerJoin(debts, eq(debtPayments.debtId, debts.id)).where(and(eq(debts.businessId, businessId), eq(debts.type, 'receivable'), dateFilterDebt));
			const totalReceivableIn = parseFloat(receivableRes[0]?.total as any || 0);

			const purchaseRes = await db.select({ total: sql`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS NUMERIC)), 0)` }).from(purchaseOrders).where(and(eq(purchaseOrders.businessId, businessId), dateFilterPurchase));
			const totalPurchaseOut = parseFloat(purchaseRes[0]?.total as any || 0);

			const cashbookOutRes = await db.select({ total: sql`COALESCE(SUM(CAST(${cashbookEntries.amount} AS NUMERIC)), 0)` }).from(cashbookEntries).where(and(eq(cashbookEntries.businessId, businessId), eq(cashbookEntries.type, 'out'), dateFilterCashbook));
			const totalCashbookOut = parseFloat(cashbookOutRes[0]?.total as any || 0);

			const payableRes = await db.select({ total: sql`COALESCE(SUM(CAST(${debtPayments.amount} AS NUMERIC)), 0)` }).from(debtPayments).innerJoin(debts, eq(debtPayments.debtId, debts.id)).where(and(eq(debts.businessId, businessId), eq(debts.type, 'payable'), dateFilterDebt));
			const totalPayableOut = parseFloat(payableRes[0]?.total as any || 0);

			const totalCashIn = totalSalesIn + totalCashbookIn + totalReceivableIn;
			const totalCashOut = totalPurchaseOut + totalCashbookOut + totalPayableOut;
			const netCashFlow = totalCashIn - totalCashOut;

			return reply.send({ success: true, data: { cashIn: { sales: totalSalesIn, cashbook: totalCashbookIn, receivable: totalReceivableIn, total: totalCashIn }, cashOut: { purchases: totalPurchaseOut, cashbook: totalCashbookOut, payable: totalPayableOut, total: totalCashOut }, netCashFlow } });
		} catch (err: unknown) {
			return reply.status(500).send({ success: false, error: { message: "Gagal menghitung laporan arus kas" } });
		}
	});

	app.get("/sales", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

			let dateFilterSales = sql`1=1`;
			if (startDate && endDate) {
				dateFilterSales = and(gte(sales.createdAt, `${startDate} 00:00:00`), lte(sales.createdAt, `${endDate} 23:59:59`)) as any;
			}

			const salesRes = await db.select({
				totalRevenue: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)`,
				totalTransactions: sql`COUNT(${sales.id})`,
			}).from(sales).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
			
			const totalRevenue = parseFloat(salesRes[0]?.totalRevenue as any || 0);
			const totalTransactions = parseInt(salesRes[0]?.totalTransactions as any || 0);

			const topProducts = await db.select({
				name: products.name,
				qty: sql`SUM(${saleItems.qty})`.mapWith(Number),
				revenue: sql`SUM(${saleItems.qty} * CAST(${saleItems.price} AS NUMERIC))`.mapWith(Number)
			}).from(saleItems)
			.innerJoin(sales, eq(saleItems.saleId, sales.id))
			.innerJoin(products, eq(saleItems.productId, products.id))
			.where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales))
			.groupBy(products.id)
			.orderBy(sql`SUM(${saleItems.qty}) DESC`)
			.limit(10);

			return reply.send({ success: true, data: { totalRevenue, totalTransactions, topProducts } });
		} catch (err: unknown) {
			return reply.status(500).send({ success: false, error: { message: "Gagal menghitung laporan penjualan" } });
		}
	});

	app.get("/inventory", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			
			const valueRes = await db.select({
				totalValue: sql`COALESCE(SUM(${productStock.quantity} * CAST(${products.costPrice} AS NUMERIC)), 0)`
			}).from(productStock)
			.innerJoin(products, eq(productStock.productId, products.id))
			.where(eq(products.businessId, businessId));

			const totalStockValue = parseFloat(valueRes[0]?.totalValue as any || 0);

			const lowStock = await db.select({
				name: products.name,
				stock: productStock.quantity,
				minStock: products.minStock
			}).from(productStock)
			.innerJoin(products, eq(productStock.productId, products.id))
			.where(and(eq(products.businessId, businessId), lte(productStock.quantity, products.minStock)))
			.orderBy(productStock.quantity);

			return reply.send({ success: true, data: { totalStockValue, lowStock } });
		} catch (err: unknown) {
			return reply.status(500).send({ success: false, error: { message: "Gagal menghitung laporan inventori" } });
		}
	});

	app.get("/dashboard", async (request, reply) => {
		try {
			const { businessId } = request.user as any;

			const todayRes = await db.execute(sql`
				SELECT COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as today_sales, COUNT(id) as today_transactions
				FROM sales 
				WHERE business_id = ${businessId} AND status != 'void' AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
			`);

			const todaySales = parseFloat(todayRes.rows[0]?.today_sales as any || 0);
			const todayTransactions = parseInt(todayRes.rows[0]?.today_transactions as any || 0);

			const weeklyRes = await db.execute(sql`
				SELECT DATE(created_at AT TIME ZONE 'Asia/Jakarta') as sale_date, COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as daily_total
				FROM sales
				WHERE business_id = ${businessId} AND status != 'void' AND created_at >= NOW() - INTERVAL '7 days'
				GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jakarta')
				ORDER BY sale_date ASC
			`);

			const weeklyData = weeklyRes.rows.map((r: any) => ({
				date: r.sale_date,
				total: parseFloat(r.daily_total),
			}));

			return reply.send({ success: true, data: { todaySales, todayTransactions, weeklyData } });
		} catch (err: unknown) {
			return reply.status(500).send({ success: false, error: { message: "Gagal mengambil data dashboard" } });
		}
	});

	app.get("/export", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user as any;
			const { tab, format, startDate, endDate } = request.query as {
				tab: string; // 'profit-loss' | 'cash-flow'
				format: string; // 'pdf' | 'excel'
				startDate?: string;
				endDate?: string;
			};

			if (!tab || !format) return reply.status(400).send({ success: false, error: { message: "Parameter tab dan format diperlukan" } });

			// Simulate request to existing routes to reuse logic
			let reportData: any;

			// Re-use logic for Profit-Loss
			let dateFilterSales = sql`1=1`;
			let dateFilterCashbook = sql`1=1`;
			let dateFilterDebt = sql`1=1`;
			let dateFilterPurchase = sql`1=1`;

			if (startDate && endDate) {
				dateFilterSales = and(gte(sales.createdAt, `${startDate} 00:00:00`), lte(sales.createdAt, `${endDate} 23:59:59`)) as any;
				dateFilterCashbook = and(gte(cashbookEntries.entryDate, startDate), lte(cashbookEntries.entryDate, endDate)) as any;
				dateFilterDebt = and(gte(debtPayments.paymentDate, startDate), lte(debtPayments.paymentDate, endDate)) as any;
				dateFilterPurchase = and(gte(purchaseOrders.createdAt, `${startDate} 00:00:00`), lte(purchaseOrders.createdAt, `${endDate} 23:59:59`)) as any;
			}

			if (tab === 'profit-loss') {
				const salesRes = await db.select({ total_revenue: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)` }).from(sales).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
				const totalRevenue = parseFloat(salesRes[0]?.total_revenue as any || 0);

				const cogsRes = await db.select({ total_cogs: sql`COALESCE(SUM(${saleItems.qty} * CAST(${products.costPrice} AS NUMERIC)), 0)` }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
				const totalCogs = parseFloat(cogsRes[0]?.total_cogs as any || 0);

				const cashbookRes = await db.select({ type: cashbookEntries.type, total: sql`COALESCE(SUM(CAST(${cashbookEntries.amount} AS NUMERIC)), 0)` }).from(cashbookEntries).where(and(eq(cashbookEntries.businessId, businessId), dateFilterCashbook)).groupBy(cashbookEntries.type);
				let totalCashIncome = 0;
				let totalCashExpense = 0;
				for (const row of cashbookRes) {
					if (row.type === "in") totalCashIncome = parseFloat(row.total as any);
					else if (row.type === "out") totalCashExpense = parseFloat(row.total as any);
				}
				const grossProfit = totalRevenue - totalCogs;
				const netProfit = grossProfit + totalCashIncome - totalCashExpense;
				reportData = { totalRevenue, totalCogs, grossProfit, totalCashIncome, totalCashExpense, netProfit };
			} else if (tab === 'cash-flow') {
				const salesRes = await db.select({ total: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)` }).from(sales).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
				const totalSalesIn = parseFloat(salesRes[0]?.total as any || 0);

				const cashbookInRes = await db.select({ total: sql`COALESCE(SUM(CAST(${cashbookEntries.amount} AS NUMERIC)), 0)` }).from(cashbookEntries).where(and(eq(cashbookEntries.businessId, businessId), eq(cashbookEntries.type, 'in'), dateFilterCashbook));
				const totalCashbookIn = parseFloat(cashbookInRes[0]?.total as any || 0);

				const receivableRes = await db.select({ total: sql`COALESCE(SUM(CAST(${debtPayments.amount} AS NUMERIC)), 0)` }).from(debtPayments).innerJoin(debts, eq(debtPayments.debtId, debts.id)).where(and(eq(debts.businessId, businessId), eq(debts.type, 'receivable'), dateFilterDebt));
				const totalReceivableIn = parseFloat(receivableRes[0]?.total as any || 0);

				const purchaseRes = await db.select({ total: sql`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS NUMERIC)), 0)` }).from(purchaseOrders).where(and(eq(purchaseOrders.businessId, businessId), dateFilterPurchase));
				const totalPurchaseOut = parseFloat(purchaseRes[0]?.total as any || 0);

				const cashbookOutRes = await db.select({ total: sql`COALESCE(SUM(CAST(${cashbookEntries.amount} AS NUMERIC)), 0)` }).from(cashbookEntries).where(and(eq(cashbookEntries.businessId, businessId), eq(cashbookEntries.type, 'out'), dateFilterCashbook));
				const totalCashbookOut = parseFloat(cashbookOutRes[0]?.total as any || 0);

				const payableRes = await db.select({ total: sql`COALESCE(SUM(CAST(${debtPayments.amount} AS NUMERIC)), 0)` }).from(debtPayments).innerJoin(debts, eq(debtPayments.debtId, debts.id)).where(and(eq(debts.businessId, businessId), eq(debts.type, 'payable'), dateFilterDebt));
				const totalPayableOut = parseFloat(payableRes[0]?.total as any || 0);

				const totalCashIn = totalSalesIn + totalCashbookIn + totalReceivableIn;
				const totalCashOut = totalPurchaseOut + totalCashbookOut + totalPayableOut;
				const netCashFlow = totalCashIn - totalCashOut;
				reportData = { cashIn: { sales: totalSalesIn, cashbook: totalCashbookIn, receivable: totalReceivableIn, total: totalCashIn }, cashOut: { purchases: totalPurchaseOut, cashbook: totalCashbookOut, payable: totalPayableOut, total: totalCashOut }, netCashFlow };
			} else if (tab === 'sales') {
				const salesRes = await db.select({
					totalRevenue: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)`,
					totalTransactions: sql`COUNT(${sales.id})`,
				}).from(sales).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales));
				const totalRevenue = parseFloat(salesRes[0]?.totalRevenue as any || 0);
				const totalTransactions = parseInt(salesRes[0]?.totalTransactions as any || 0);

				const topProducts = await db.select({
					name: products.name,
					qty: sql`SUM(${saleItems.qty})`.mapWith(Number),
					revenue: sql`SUM(${saleItems.qty} * CAST(${saleItems.price} AS NUMERIC))`.mapWith(Number)
				}).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).innerJoin(products, eq(saleItems.productId, products.id)).where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), dateFilterSales)).groupBy(products.id).orderBy(sql`SUM(${saleItems.qty}) DESC`);
				reportData = { totalRevenue, totalTransactions, topProducts };
			} else if (tab === 'inventory') {
				const valueRes = await db.select({
					totalValue: sql`COALESCE(SUM(${productStock.quantity} * CAST(${products.costPrice} AS NUMERIC)), 0)`
				}).from(productStock).innerJoin(products, eq(productStock.productId, products.id)).where(eq(products.businessId, businessId));
				const totalStockValue = parseFloat(valueRes[0]?.totalValue as any || 0);

				const inventoryItems = await db.select({
					name: products.name,
					stock: productStock.quantity,
					minStock: products.minStock,
					value: sql`${productStock.quantity} * CAST(${products.costPrice} AS NUMERIC)`.mapWith(Number)
				}).from(productStock).innerJoin(products, eq(productStock.productId, products.id)).where(eq(products.businessId, businessId)).orderBy(products.name);
				reportData = { totalStockValue, inventoryItems };
			}

			// Generate file
			const { exportToExcel, exportToPDF } = await import("./export.js") as any;
			let buffer: Buffer;

			if (format === 'excel') {
				buffer = await exportToExcel(reportData, tab);
				reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				reply.header('Content-Disposition', `attachment; filename="Laporan_${tab}.xlsx"`);
			} else if (format === 'pdf') {
				buffer = await exportToPDF(reportData, tab);
				reply.header('Content-Type', 'application/pdf');
				reply.header('Content-Disposition', `attachment; filename="Laporan_${tab}.pdf"`);
			} else {
				return reply.status(400).send({ success: false, error: { message: "Format tidak didukung" } });
			}

			return reply.send(buffer);
		} catch (err: unknown) {
			app.log.error(err);
			return reply.status(500).send({ success: false, error: { message: "Gagal mengekspor laporan" } });
		}
	});
}
