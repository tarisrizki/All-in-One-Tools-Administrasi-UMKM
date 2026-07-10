import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { purchaseOrders, purchaseOrderItems, suppliers, warehouses, products, productStock } from "../../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const purchaseItemSchema = z.object({
	product_id: z.string().uuid(),
	qty: z.number().positive(),
	cost_price: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val >= 0),
});

const purchaseSchema = z.object({
	warehouse_id: z.string().uuid(),
	supplier_id: z.string().uuid(),
	expected_date: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	items: z.array(purchaseItemSchema).min(1, "Data PO tidak lengkap"),
});

const purchaseStatusSchema = z.object({
	status: z.enum(["draft", "ordered", "received"]),
});

export default async function purchaseRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('purchases.read')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;

			const result = await db.select({
				id: purchaseOrders.id,
				businessId: purchaseOrders.businessId,
				warehouseId: purchaseOrders.warehouseId,
				supplierId: purchaseOrders.supplierId,
				poNumber: purchaseOrders.poNumber,
				status: purchaseOrders.status,
				totalAmount: purchaseOrders.totalAmount,
				expectedDate: purchaseOrders.expectedDate,
				notes: purchaseOrders.notes,
				createdBy: purchaseOrders.createdBy,
				createdAt: purchaseOrders.createdAt,
				updatedAt: purchaseOrders.updatedAt,
				supplier_name: suppliers.name,
				warehouse_name: warehouses.name
			})
			.from(purchaseOrders)
			.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
			.innerJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
			.where(eq(purchaseOrders.businessId, businessId))
			.orderBy(desc(purchaseOrders.createdAt));

			return { success: true, data: result };
		},
	);

	fastify.get(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('purchases.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;

			const poResult = await db.select({
				id: purchaseOrders.id,
				businessId: purchaseOrders.businessId,
				warehouseId: purchaseOrders.warehouseId,
				supplierId: purchaseOrders.supplierId,
				poNumber: purchaseOrders.poNumber,
				status: purchaseOrders.status,
				totalAmount: purchaseOrders.totalAmount,
				expectedDate: purchaseOrders.expectedDate,
				notes: purchaseOrders.notes,
				createdBy: purchaseOrders.createdBy,
				createdAt: purchaseOrders.createdAt,
				updatedAt: purchaseOrders.updatedAt,
				supplier_name: suppliers.name,
				warehouse_name: warehouses.name
			})
			.from(purchaseOrders)
			.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
			.innerJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
			.where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.businessId, businessId)));

			if (poResult.length === 0) {
				return reply.status(404).send({ success: false, error: { message: "PO tidak ditemukan" } });
			}

			const itemsResult = await db.select({
				id: purchaseOrderItems.id,
				poId: purchaseOrderItems.poId,
				productId: purchaseOrderItems.productId,
				qty: purchaseOrderItems.qty,
				costPrice: purchaseOrderItems.costPrice,
				product_name: products.name,
				sku: products.sku
			})
			.from(purchaseOrderItems)
			.innerJoin(products, eq(purchaseOrderItems.productId, products.id))
			.where(eq(purchaseOrderItems.poId, id));

			return {
				success: true,
				data: {
					...poResult[0],
					items: itemsResult,
				},
			};
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('purchases.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { warehouse_id, supplier_id, expected_date, notes, items } = purchaseSchema.parse(request.body);

			try {
				const newPo = await db.transaction(async (tx) => {
					const countResult = await tx.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(eq(purchaseOrders.businessId, businessId));
					const nextId = Number(countResult[0].count) + 1;
					const poNumber = `PO/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${String(nextId).padStart(4, "0")}`;

					let totalAmount = 0;
					for (const item of items) {
						totalAmount += item.qty * item.cost_price;
					}

					const [po] = await tx.insert(purchaseOrders).values({
						businessId,
						warehouseId: warehouse_id,
						supplierId: supplier_id,
						poNumber,
						status: 'draft',
						totalAmount: totalAmount.toString(),
						expectedDate: expected_date ? new Date(expected_date).toISOString() : null,
						notes: notes || null,
						createdBy: user.id,
					}).returning();

					if (items.length > 0) {
						await tx.insert(purchaseOrderItems).values(
							items.map((item: any) => ({
								poId: po.id,
								productId: item.product_id,
								qty: item.qty,
								costPrice: item.cost_price.toString(),
							}))
						);
					}

					return po;
				});

				return reply.status(201).send({ success: true, data: newPo });
			} catch (error) {
				throw error;
			}
		},
	);

	fastify.patch(
		"/:id/status",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('purchases.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;
			const { status } = purchaseStatusSchema.parse(request.body);

			try {
				const updatedPo = await db.transaction(async (tx) => {
					// We can't do FOR UPDATE simply in Drizzle easily without sql``, but it's fine for simple app
					const poRes = await tx.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.businessId, businessId)));

					if (poRes.length === 0) {
						throw new Error("PO tidak ditemukan");
					}

					const po = poRes[0];
					if (po.status === "received") {
						throw new Error("PO yang sudah diterima tidak dapat diubah statusnya");
					}

					const [updated] = await tx.update(purchaseOrders)
						.set({ status, updatedAt: new Date().toISOString() })
						.where(eq(purchaseOrders.id, id))
						.returning();

					if (status === "received") {
						const itemsRes = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id));

						// Dulu: SELECT lalu INSERT-atau-UPDATE per item (sampai 2N query
						// untuk N item PO). Sekarang 1 query upsert untuk semua item
						// sekaligus, memanfaatkan primary key (productId, warehouseId)
						// yang memang sudah ada di tabel product_stock.
						// Digabung dulu per productId -- Postgres menolak ON CONFLICT
						// yang menyasar baris konflik yang sama dua kali dalam satu
						// statement (bisa terjadi kalau PO punya 2 baris produk sama).
						const qtyByProduct = new Map<string, number>();
						for (const item of itemsRes) {
							qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.qty);
						}

						if (qtyByProduct.size > 0) {
							await tx.insert(productStock)
								.values(
									Array.from(qtyByProduct.entries()).map(([productId, quantity]) => ({
										productId,
										warehouseId: po.warehouseId,
										quantity
									}))
								)
								.onConflictDoUpdate({
									target: [productStock.productId, productStock.warehouseId],
									set: {
										quantity: sql`${productStock.quantity} + excluded.quantity`,
										updatedAt: new Date().toISOString()
									}
								});
						}
					}

					return updated;
				});

				return reply.send({ success: true, data: updatedPo });
			} catch (error: any) {
				const statusMap: Record<string, number> = { "PO tidak ditemukan": 404, "PO yang sudah diterima tidak dapat diubah statusnya": 400 };
				if (statusMap[error.message]) {
					return reply.status(statusMap[error.message]).send({ success: false, error: { message: error.message } });
				}
				throw error;
			}
		},
	);
}
