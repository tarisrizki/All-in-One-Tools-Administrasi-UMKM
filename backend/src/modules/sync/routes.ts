import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { sales, saleItems, payments, productStock, warehouses, products, categories } from "../../db/schema.js";
import { eq, and, sql, gte, getTableColumns } from "drizzle-orm";
import { randomUUID } from "crypto";
import { customers } from "../../db/schema.js";

const saleItemSchema = z.object({
	productId: z.string().uuid(),
	qty: z.number().min(1),
	price: z.number().min(0),
	discount: z.number().min(0).default(0),
});

const paymentSchema = z.object({
	method: z.string().max(50),
	amount: z.number().min(0),
});

const syncPushSchema = z.object({
	transactions: z.array(
		z.object({
			client_transaction_id: z.string().uuid(),
			items: z.array(saleItemSchema).min(1),
			payments: z.array(paymentSchema).min(1),
			customerName: z.string().max(255).nullable().optional(),
			customerPhone: z.string().max(30).nullable().optional(),
			notes: z.string().nullable().optional(),
		})
	)
});

export default async function syncRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.get("/pull", async (request, reply) => {
		try {
			const { businessId } = request.user;
			const { since } = request.query as { since?: string };
			
			const pConds = [eq(products.businessId, businessId)];
			const cConds = [eq(categories.businessId, businessId)];
			const custConds = [eq(customers.businessId, businessId)];

			if (since) {
				const sinceDate = new Date(since).toISOString();
				pConds.push(gte(products.updatedAt, sinceDate));
				cConds.push(gte(categories.createdAt, sinceDate));
				custConds.push(gte(customers.updatedAt, sinceDate));
			}

			const productsQuery = db.select({
				id: products.id,
				businessId: products.businessId,
				categoryId: products.categoryId,
				sku: products.sku,
				barcode: products.barcode,
				name: products.name,
				description: products.description,
				unit: products.unit,
				price: products.sellPrice,
				stock: productStock.quantity,
				minStock: products.minStock,
				image: products.imageUrl,
				isActive: products.isActive,
				updatedAt: products.updatedAt
			}).from(products)
			.leftJoin(productStock, eq(products.id, productStock.productId))
			.where(and(...pConds));

			const categoriesQuery = db.select().from(categories).where(and(...cConds));
			
			const customersQuery = db.select({
				...getTableColumns(customers),
				totalSpent: sql<number>`COALESCE(SUM(${sales.grandTotal}), 0)`.mapWith(Number)
			})
				.from(customers)
				.leftJoin(sales, and(eq(sales.customerId, customers.id), eq(sales.status, 'paid')))
				.where(and(...custConds))
				.groupBy(customers.id);

			const [productsRes, categoriesRes, customersRes] = await Promise.all([
				productsQuery,
				categoriesQuery,
				customersQuery
			]);

			return reply.send({
				success: true,
				data: {
					products: productsRes.map(p => ({
						...p,
						price: parseFloat(p.price as string),
						stock: p.stock || 0
					})),
					categories: categoriesRes,
					customers: customersRes.map(c => {
						let tier = 'Reguler';
						if (c.totalSpent >= 5000000) tier = 'Gold';
						else if (c.totalSpent >= 1000000) tier = 'Silver';
						return { ...c, tier };
					})
				}
			});

		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal menarik sinkronisasi";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});

	app.post("/push", async (request, reply) => {
		try {
			const { businessId, userId } = request.user;
			const data = syncPushSchema.parse(request.body);

			const result = await db.transaction(async (tx) => {
				const whRes = await tx.select({ id: warehouses.id })
					.from(warehouses)
					.where(and(eq(warehouses.businessId, businessId), eq(warehouses.isDefault, true)))
					.limit(1);
				
				if (whRes.length === 0) throw new Error("Gudang tidak ditemukan");
				const warehouseId = whRes[0].id;

				let processed = 0;

				for (const t of data.transactions) {
					// Idempotency check
					const existingSale = await tx.select({ id: sales.id })
						.from(sales)
						.where(and(eq(sales.businessId, businessId), eq(sales.clientTransactionId, t.client_transaction_id)))
						.limit(1);

					if (existingSale.length > 0) continue; // Skip existing

					let subtotal = 0;
					let discountTotal = 0;
					for (const item of t.items) {
						subtotal += item.price * item.qty;
						discountTotal += item.discount * item.qty;
					}
					const grandTotal = subtotal - discountTotal;

					const invoiceNumber = `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(Math.random() * 10000)}`;

					const [sale] = await tx.insert(sales).values({
						businessId,
						warehouseId,
						clientTransactionId: t.client_transaction_id,
						invoiceNumber,
						subtotal: subtotal.toString(),
						discountTotal: discountTotal.toString(),
						grandTotal: grandTotal.toString(),
						createdBy: userId,
					}).returning();

					// Dulu: 1 INSERT + 1 UPDATE per item, dijalankan satu-satu dalam loop.
					// Untuk N transaksi offline x M item, ini bisa jadi ratusan round-trip
					// DB dalam SATU request sync. Baris saleItems sekarang di-insert
					// sekaligus (1 query untuk semua item), update stok tetap per baris
					// karena tiap item punya productId berbeda (tidak bisa digabung aman
					// dalam satu UPDATE tanpa CASE WHEN yang rawan salah produk).
					if (t.items.length > 0) {
						await tx.insert(saleItems).values(
							t.items.map((item) => ({
								saleId: sale.id,
								productId: item.productId,
								qty: item.qty,
								price: item.price.toString(),
								discount: item.discount.toString(),
							}))
						);
					}
					for (const item of t.items) {
						// Update stock
						await tx.update(productStock)
							.set({
								quantity: sql`${productStock.quantity} - ${item.qty}`,
								updatedAt: new Date().toISOString()
							})
							.where(and(eq(productStock.productId, item.productId), eq(productStock.warehouseId, warehouseId)));
					}

					let totalPaid = 0;
					for (const pay of t.payments) {
						totalPaid += pay.amount;
					}
					if (t.payments.length > 0) {
						await tx.insert(payments).values(
							t.payments.map((pay) => ({
								saleId: sale.id,
								method: pay.method,
								amount: pay.amount.toString(),
							}))
						);
					}

					const status = totalPaid >= grandTotal ? "paid" : "partial";
					if (status !== "paid") {
						await tx.update(sales).set({ status }).where(eq(sales.id, sale.id));
						
						// Insert Piutang
						const { debts } = await import('../../db/schema.js');
						const remainingAmount = grandTotal - totalPaid;
						await tx.insert(debts).values({
							businessId,
							type: 'piutang',
							entityName: t.customerName || 'Pelanggan Umum',
							entityPhone: t.customerPhone,
							amount: remainingAmount.toString(),
							remainingAmount: remainingAmount.toString(),
							status: 'unpaid',
							notes: `Piutang sinkronisasi ${invoiceNumber}`,
							createdBy: userId
						});
					}

					processed++;
				}

				return { processed };
			});

			return reply.send({ success: true, message: `Berhasil push ${result.processed} transaksi` });

		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal mendorong sinkronisasi";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});
}
