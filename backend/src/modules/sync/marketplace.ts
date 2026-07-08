import type { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { sales, payments, warehouses, products, saleItems, productStock } from "../../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

export default async function marketplaceRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.post("/pull/tokopedia", async (request, reply) => {
		try {
			const { businessId, userId } = request.user;
			
			// Mocking Tokopedia Order Payload
			const mockOrders = [
				{
					order_id: "INV/TKP/" + Date.now() + "/1",
					customer_name: "Budi Tokopedia",
					total: 50000,
					items: [
						{ sku: "SKU-DUMMY", name: "Produk Marketplace", qty: 2, price: 25000 }
					]
				}
			];

			const result = await db.transaction(async (tx) => {
				const whRes = await tx.select({ id: warehouses.id })
					.from(warehouses)
					.where(and(eq(warehouses.businessId, businessId), eq(warehouses.isDefault, true)))
					.limit(1);
				
				if (whRes.length === 0) throw new Error("Gudang default tidak ditemukan");
				const warehouseId = whRes[0].id;

				let processed = 0;

				for (const order of mockOrders) {
					// 1. Insert Sale Header
					const [sale] = await tx.insert(sales).values({
						businessId,
						warehouseId,
						clientTransactionId: order.order_id,
						invoiceNumber: order.order_id,
						subtotal: order.total.toString(),
						discountTotal: "0",
						grandTotal: order.total.toString(),
						status: "paid",
						createdBy: userId,
					}).returning();

					// 2. Insert Payment
					await tx.insert(payments).values({
						saleId: sale.id,
						method: "tokopedia",
						amount: order.total.toString(),
					});

					// 3. Process Items
					for (const item of order.items) {
						// Look for product by SKU
						const pRes = await tx.select({ id: products.id }).from(products)
							.where(and(eq(products.businessId, businessId), eq(products.sku, item.sku)))
							.limit(1);
						
						let productId = pRes.length > 0 ? pRes[0].id : null;

						// If product doesn't exist, create a dummy one just for the sake of mock
						if (!productId) {
							// get default category
							const { categories } = await import('../../db/schema.js');
							const catRes = await tx.select({ id: categories.id }).from(categories)
								.where(eq(categories.businessId, businessId)).limit(1);
							
							if (catRes.length > 0) {
								const [newProd] = await tx.insert(products).values({
									businessId,
									categoryId: catRes[0].id,
									name: item.name,
									sku: item.sku,
									sellPrice: item.price.toString(),
									costPrice: (item.price * 0.8).toString()
								}).returning();
								productId = newProd.id;

								await tx.insert(productStock).values({
									productId,
									warehouseId,
									quantity: 100 // dummy stock
								});
							}
						}

						if (productId) {
							await tx.insert(saleItems).values({
								saleId: sale.id,
								productId,
								qty: item.qty,
								price: item.price.toString(),
								discount: "0"
							});

							await tx.update(productStock)
								.set({ quantity: sql`${productStock.quantity} - ${item.qty}` })
								.where(and(eq(productStock.productId, productId), eq(productStock.warehouseId, warehouseId)));
						}
					}

					processed++;
				}
				return { processed };
			});

			return reply.send({ success: true, message: `Berhasil sinkronisasi ${result.processed} order dari Tokopedia` });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal sinkronisasi marketplace";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});
}
