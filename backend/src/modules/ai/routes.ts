import type { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { sales, saleItems, products, debts, productStock } from "../../db/schema.js";
import { eq, and, sql, gte, lte, desc, ne } from "drizzle-orm";

export default async function aiRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.get("/predictions", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user as any;
			
			// 1. Prediksi Stok (Stock Out Prediction)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];

			const soldStats = await db.select({
				productId: saleItems.productId,
				productName: products.name,
				currentStock: sql`COALESCE(SUM(${productStock.quantity}), 0)`,
				totalSold: sql`SUM(${saleItems.qty})`
			})
			.from(saleItems)
			.innerJoin(sales, eq(saleItems.saleId, sales.id))
			.innerJoin(products, eq(saleItems.productId, products.id))
			.leftJoin(productStock, eq(productStock.productId, products.id))
			.where(and(
				eq(sales.businessId, businessId),
				ne(sales.status, 'void'),
				gte(sales.createdAt, `${startDateStr} 00:00:00`)
			))
			.groupBy(saleItems.productId, products.name);

			const stockPredictions = soldStats.map((item: any) => {
				const dailyVelocity = parseFloat(item.totalSold) / 30;
				const daysToEmpty = dailyVelocity > 0 ? (item.currentStock / dailyVelocity) : 999;
				return {
					...item,
					dailyVelocity,
					daysToEmpty,
					status: daysToEmpty < 7 ? 'critical' : (daysToEmpty < 14 ? 'warning' : 'safe')
				};
			}).filter(p => p.status !== 'safe').sort((a, b) => a.daysToEmpty - b.daysToEmpty);

			// 2. Prediksi Penjualan
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			
			const fourteenDaysAgo = new Date();
			fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

			const s1 = sevenDaysAgo.toISOString().split("T")[0];
			const s2 = fourteenDaysAgo.toISOString().split("T")[0];

			const last7DaysSales = await db.select({ total: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)` })
				.from(sales)
				.where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), gte(sales.createdAt, `${s1} 00:00:00`)));
			
			const prev7DaysSales = await db.select({ total: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)` })
				.from(sales)
				.where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), gte(sales.createdAt, `${s2} 00:00:00`), lte(sales.createdAt, `${s1} 23:59:59`)));

			const last7 = parseFloat(last7DaysSales[0]?.total as any || 0);
			const prev7 = parseFloat(prev7DaysSales[0]?.total as any || 0);
			
			let growthRate = 0;
			if (prev7 > 0) {
				growthRate = ((last7 - prev7) / prev7);
			}
			
			// Proyeksi ke depan
			const projected30Days = (last7 / 7) * 30 * (1 + (growthRate > 0.5 ? 0.5 : growthRate));

			return reply.send({
				success: true,
				data: {
					stockAlerts: stockPredictions,
					salesProjection: {
						last7Days: last7,
						prev7Days: prev7,
						growthRate: growthRate * 100,
						projectedNext30Days: Math.round(projected30Days)
					}
				}
			});

		} catch (err) {
			app.log.error(err);
			return reply.status(500).send({ success: false, error: { message: "Gagal menghitung prediksi AI" } });
		}
	});

	app.get("/summary", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user as any;
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			const startDate = sevenDaysAgo.toISOString().split("T")[0];

			const salesRes = await db.select({ total: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)` })
				.from(sales)
				.where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), gte(sales.createdAt, `${startDate} 00:00:00`)));
			const totalRevenue = parseFloat(salesRes[0]?.total as any || 0);

			const debtRes = await db.select({ total: sql`COALESCE(SUM(CAST(${debts.remainingAmount} AS NUMERIC)), 0)` })
				.from(debts)
				.where(and(eq(debts.businessId, businessId), eq(debts.type, 'receivable'), eq(debts.status, 'unpaid')));
			const totalReceivables = parseFloat(debtRes[0]?.total as any || 0);

			const topProducts = await db.select({ name: products.name, sold: sql`SUM(${saleItems.qty})` })
				.from(saleItems)
				.innerJoin(sales, eq(saleItems.saleId, sales.id))
				.innerJoin(products, eq(saleItems.productId, products.id))
				.where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), gte(sales.createdAt, `${startDate} 00:00:00`)))
				.groupBy(products.name)
				.orderBy(desc(sql`SUM(${saleItems.qty})`))
				.limit(2);

			let productText = "Belum ada data produk terjual minggu ini.";
			if (topProducts.length > 0) {
				productText = `Produk terlaris adalah ${topProducts.map(p => p.name).join(' dan ')}.`;
			}

			const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

			const summary = `Pendapatan minggu ini mencapai **${formatRupiah(totalRevenue)}**. ${productText} Total tagihan kasbon yang belum lunas sebesar **${formatRupiah(totalReceivables)}**.`;

			return reply.send({ success: true, data: { summary } });
		} catch (err) {
			app.log.error(err);
			return reply.status(500).send({ success: false, error: { message: "Gagal membuat ringkasan" } });
		}
	});

	app.post("/chat", { preHandler: [app.requirePermission('reports.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user as any;
			const { message } = request.body as { message: string };
			
			const msg = message.toLowerCase();
			let response = "Maaf, saya belum mengerti. Anda bisa bertanya tentang **stok**, **omzet** (penjualan), atau **piutang** (kasbon).";

			const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

			if (msg.includes("stok")) {
				const lowStock = await db.select({ name: products.name, stock: sql`COALESCE(SUM(${productStock.quantity}), 0)` })
					.from(products)
					.leftJoin(productStock, eq(productStock.productId, products.id))
					.where(eq(products.businessId, businessId))
					.groupBy(products.id)
					.having(sql`COALESCE(SUM(${productStock.quantity}), 0) <= 5`)
					.orderBy(sql`COALESCE(SUM(${productStock.quantity}), 0)`)
					.limit(5);
				
				if (lowStock.length > 0) {
					response = "Ini daftar beberapa produk dengan stok menipis (<= 5):\n" + 
						lowStock.map(p => `- ${p.name}: **${p.stock}** tersisa`).join("\n") +
						"\n\nJangan lupa segera restock ya!";
				} else {
					response = "Stok barang Anda semuanya masih dalam kondisi aman (>5).";
				}
			} else if (msg.includes("omzet") || msg.includes("penjualan") || msg.includes("pendapatan")) {
				const today = new Date().toISOString().split("T")[0];
				const salesRes = await db.select({ total: sql`COALESCE(SUM(CAST(${sales.grandTotal} AS NUMERIC)), 0)` })
					.from(sales)
					.where(and(eq(sales.businessId, businessId), ne(sales.status, 'void'), gte(sales.createdAt, `${today} 00:00:00`)));
				const total = parseFloat(salesRes[0]?.total as any || 0);
				response = `Omzet Anda hari ini adalah **${formatRupiah(total)}**.`;
			} else if (msg.includes("piutang") || msg.includes("kasbon") || msg.includes("hutang")) {
				const debtRes = await db.select({ total: sql`COALESCE(SUM(CAST(${debts.remainingAmount} AS NUMERIC)), 0)` })
					.from(debts)
					.where(and(eq(debts.businessId, businessId), eq(debts.type, 'receivable'), eq(debts.status, 'unpaid')));
				const total = parseFloat(debtRes[0]?.total as any || 0);
				response = `Total tagihan piutang (kasbon pelanggan) yang belum dibayar saat ini adalah **${formatRupiah(total)}**.`;
			}

			return reply.send({ success: true, data: { response } });
		} catch (err) {
			app.log.error(err);
			return reply.status(500).send({ success: false, error: { message: "Gagal memproses chat AI" } });
		}
	});
}
