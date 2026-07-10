import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { sales, saleItems, payments, productStock, warehouses } from "../../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

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

const saleSchema = z.object({
	clientTransactionId: z.string().uuid().optional(),
	items: z.array(saleItemSchema).min(1),
	payments: z.array(paymentSchema).min(1),
	customerName: z.string().max(255).optional().nullable(),
	customerPhone: z.string().max(30).optional().nullable(),
	customerId: z.string().uuid().optional().nullable(),
	redeemPoints: z.number().min(0).optional().default(0),
});

export default async function salesRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	// Riwayat transaksi -- sebelumnya tidak ada endpoint list sama sekali,
	// jadi struk yang sudah ditutup di POS tidak bisa dicari/dilihat lagi.
	app.get("/", { preHandler: [app.requirePermission('pos.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			const { search, from, to, page = '1', limit = '20' } = request.query as {
				search?: string; from?: string; to?: string; page?: string; limit?: string;
			};
			const { customers } = await import('../../db/schema.js');
			const pageNum = Math.max(parseInt(page, 10) || 1, 1);
			const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
			const offset = (pageNum - 1) * limitNum;

			const conditions = [eq(sales.businessId, businessId)];
			if (search) {
				conditions.push(
					sql`(${sales.invoiceNumber} ILIKE ${'%' + search + '%'} OR ${customers.name} ILIKE ${'%' + search + '%'})`
				);
			}
			if (from) conditions.push(sql`${sales.createdAt} >= ${from}`);
			if (to) conditions.push(sql`${sales.createdAt} <= ${to}`);

			const rows = await db
				.select({
					id: sales.id,
					invoiceNumber: sales.invoiceNumber,
					grandTotal: sales.grandTotal,
					status: sales.status,
					createdAt: sales.createdAt,
					customerName: customers.name,
				})
				.from(sales)
				.leftJoin(customers, eq(sales.customerId, customers.id))
				.where(and(...conditions))
				.orderBy(sql`${sales.createdAt} DESC`)
				.limit(limitNum)
				.offset(offset);

			// Ambil metode pembayaran utama tiap transaksi dalam satu query terpisah (ringan, dibatasi oleh saleId yang sudah difilter).
			const saleIds = rows.map((r) => r.id);
			let methodMap: Record<string, string> = {};
			if (saleIds.length > 0) {
				const payRows = await db
					.select({ saleId: payments.saleId, method: payments.method })
					.from(payments)
					.where(sql`${payments.saleId} IN ${saleIds}`);
				for (const p of payRows) {
					if (!methodMap[p.saleId]) methodMap[p.saleId] = p.method;
				}
			}

			const totalRes = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(sales)
				.leftJoin(customers, eq(sales.customerId, customers.id))
				.where(and(...conditions));

			return reply.send({
				success: true,
				data: rows.map((r) => ({ ...r, paymentMethod: methodMap[r.id] || '-' })),
				pagination: { page: pageNum, limit: limitNum, total: totalRes[0]?.count || 0 }
			});
		} catch (err: any) {
			return reply.status(500).send({ success: false, error: { message: err.message || "Gagal mengambil riwayat transaksi" } });
		}
	});

	app.post("/", { preHandler: [app.requirePermission('pos.write')] }, async (request, reply) => {
		try {
			const { businessId, userId } = request.user;
			const data = saleSchema.parse(request.body);

			const clientTxId = data.clientTransactionId || randomUUID();

			const result = await db.transaction(async (tx) => {
				// Idempotency check
				const existingSale = await tx.select({ id: sales.id })
					.from(sales)
					.where(and(eq(sales.businessId, businessId), eq(sales.clientTransactionId, clientTxId)))
					.limit(1);

				if (existingSale.length > 0) {
					return { duplicate: true, id: existingSale[0].id };
				}

				// Get warehouse
				const whRes = await tx.select({ id: warehouses.id })
					.from(warehouses)
					.where(and(eq(warehouses.businessId, businessId), eq(warehouses.isDefault, true)))
					.limit(1);
				
				if (whRes.length === 0) throw new Error("Gudang tidak ditemukan");
				const warehouseId = whRes[0].id;

				// Calculate totals
				let subtotal = 0;
				let discountTotal = 0;
				for (const item of data.items) {
					subtotal += item.price * item.qty;
					discountTotal += item.discount * item.qty;
				}
				
				// Handle Loyalty Points
				let appliedRedeemPoints = 0;
				let earnedPoints = 0;
				if (data.customerId) {
					const { customers } = await import('../../db/schema.js');
					const customerRes = await tx.select().from(customers).where(eq(customers.id, data.customerId)).limit(1);
					
					if (customerRes.length > 0) {
						const customer = customerRes[0];
						
						if (data.redeemPoints && data.redeemPoints > 0) {
							if (customer.loyaltyPoints < data.redeemPoints) {
								throw new Error("Poin pelanggan tidak mencukupi untuk di-redeem.");
							}
							appliedRedeemPoints = data.redeemPoints;
							const pointDiscount = appliedRedeemPoints * 100;
							discountTotal += pointDiscount;
						}
					} else {
						throw new Error("Pelanggan tidak ditemukan");
					}
				}

				const grandTotal = subtotal - discountTotal;

				// Earn new points (1 point per Rp 10.000 of final grandTotal)
				if (data.customerId) {
					earnedPoints = Math.floor(grandTotal / 10000);
				}

				const invoiceNumber = `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(Math.random() * 10000)}`;

				// 1. Insert Sale
				const [sale] = await tx.insert(sales).values({
					businessId,
					warehouseId,
					customerId: data.customerId || null,
					clientTransactionId: clientTxId,
					invoiceNumber,
					subtotal: subtotal.toString(),
					discountTotal: discountTotal.toString(),
					grandTotal: grandTotal.toString(),
					createdBy: userId,
				}).returning();

				// 2. Insert Items (satu query untuk semua baris, bukan 1 insert per item)
				//    lalu update stok per produk (tetap per-baris, lihat catatan di
				//    sync/routes.ts untuk alasannya).
				if (data.items.length > 0) {
					await tx.insert(saleItems).values(
						data.items.map((item) => ({
							saleId: sale.id,
							productId: item.productId,
							qty: item.qty,
							price: item.price.toString(),
							discount: item.discount.toString(),
						}))
					);
				}
				for (const item of data.items) {
					// Update stock
					await tx.update(productStock)
						.set({
							quantity: sql`${productStock.quantity} - ${item.qty}`,
							updatedAt: new Date().toISOString()
						})
						.where(and(eq(productStock.productId, item.productId), eq(productStock.warehouseId, warehouseId)));
				}

				// 3. Insert Payments (dibatch juga)
				let totalPaid = 0;
				for (const pay of data.payments) {
					totalPaid += pay.amount;
				}
				if (data.payments.length > 0) {
					await tx.insert(payments).values(
						data.payments.map((pay) => ({
							saleId: sale.id,
							method: pay.method,
							amount: pay.amount.toString(),
						}))
					);
				}

				// 4. Update status if fully paid or partial
				const status = totalPaid >= grandTotal ? "paid" : "partial";
				if (status !== "paid") {
					await tx.update(sales).set({ status }).where(eq(sales.id, sale.id));
					sale.status = status;
					
					// Insert Piutang
					const { debts } = await import('../../db/schema.js');
					const remainingAmount = grandTotal - totalPaid;
					
					await tx.insert(debts).values({
						businessId,
						type: 'piutang',
						entityName: data.customerName || 'Pelanggan Umum',
						entityPhone: data.customerPhone || null,
						amount: remainingAmount.toString(),
						remainingAmount: remainingAmount.toString(),
						status: 'unpaid',
						notes: `Piutang transaksi ${invoiceNumber}`,
						createdBy: userId
					});
				}

				// 5. Update Loyalty Points
				if (data.customerId) {
					const { customers } = await import('../../db/schema.js');
					await tx.update(customers)
						.set({ 
							loyaltyPoints: sql`${customers.loyaltyPoints} - ${appliedRedeemPoints} + ${earnedPoints}` 
						})
						.where(eq(customers.id, data.customerId));
				}

				return { duplicate: false, sale };
			});

			if (result.duplicate) {
				return reply.status(200).send({
					success: true,
					message: "Transaksi sudah ada",
					data: { id: result.id },
				});
			}

			return reply.status(201).send({ success: true, data: result.sale });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal memproses transaksi";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});

	app.get("/:id/document", { preHandler: [app.requirePermission('pos.read')] }, async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { type } = request.query as { type?: 'invoice' | 'nota' | 'kwitansi' | 'surat_jalan' };
			const docType = type || 'invoice';

			const { businessId } = request.user;

			// Fetch Sale
			const saleRes = await db.query.sales.findFirst({
				where: (sales, { eq, and, or }) => and(or(eq(sales.id, id), eq(sales.clientTransactionId, id)), eq(sales.businessId, businessId)),
			});

			if (!saleRes) return reply.status(404).send({ success: false, error: { message: "Transaksi tidak ditemukan" } });

			// Fetch Items
			const items = await db.query.saleItems.findMany({
				where: (saleItems, { eq }) => eq(saleItems.saleId, saleRes.id),
				with: {
					product: {
						columns: { name: true }
					}
				}
			});

			// Fetch Payments
			const salePayments = await db.query.payments.findMany({
				where: (payments, { eq }) => eq(payments.saleId, saleRes.id),
			});

			// Fetch Business info
			const biz = await db.query.businesses.findFirst({
				where: (businesses, { eq }) => eq(businesses.id, businessId)
			});

			const saleData = {
				...saleRes,
				items: items.map(i => ({ ...i, productName: (i as any).product?.name })),
				payments: salePayments
			};

			const { generateSalesDocument } = await import("./pdf.js") as any;
			const pdfBuffer = await generateSalesDocument(saleData, biz, docType);

			reply.header('Content-Type', 'application/pdf');
			reply.header('Content-Disposition', `inline; filename="${docType}-${saleRes.invoiceNumber.replace(/\//g, '-')}.pdf"`);
			return reply.send(pdfBuffer);

		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal generate dokumen";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});

	// Midtrans QRIS integration
	app.post("/qris-token", async (request, reply) => {
		try {
			const { amount, orderId } = request.body as { amount: number, orderId: string };
			const { businessId } = request.user;
			
			const qrisData = await app.createQrisPayment(orderId, amount);
			
			return reply.send({ success: true, data: qrisData });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal membuat pembayaran QRIS";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});

	// Send WA Receipt
	app.post("/:id/send-wa", async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { to, message } = request.body as { to: string, message?: string };
			const { businessId } = request.user;
			
			const saleRes = await db.select().from(sales).where(and(eq(sales.id, id), eq(sales.businessId, businessId))).limit(1);
			if (saleRes.length === 0) return reply.status(404).send({ success: false, error: { message: "Penjualan tidak ditemukan" } });
			
			const defaultMsg = `Terima kasih atas pembelanjaan Anda di toko kami!\nNo. Nota: ${saleRes[0].invoiceNumber}\nTotal: Rp${saleRes[0].grandTotal}`;
			const finalMsg = message || defaultMsg;

			const success = await app.sendWhatsAppMessage(to, finalMsg);
			
			if (success) {
				return reply.send({ success: true, message: "Pesan WA berhasil dikirim (atau disimulasikan)" });
			} else {
				return reply.status(500).send({ success: false, error: { message: "Gagal mengirim pesan WA" } });
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal memproses WA";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});

	// Send Email Receipt
	app.post("/:id/send-email", async (request, reply) => {
		try {
			const { id } = request.params as { id: string };
			const { to, subject } = request.body as { to: string, subject?: string };
			const { businessId } = request.user;
			
			const saleRes = await db.select().from(sales).where(and(eq(sales.id, id), eq(sales.businessId, businessId))).limit(1);
			if (saleRes.length === 0) return reply.status(404).send({ success: false, error: { message: "Penjualan tidak ditemukan" } });
			
			const finalSubject = subject || `Invoice Pembelian ${saleRes[0].invoiceNumber}`;
			const html = `<h3>Terima kasih atas pembelanjaan Anda!</h3><p>Invoice: <b>${saleRes[0].invoiceNumber}</b></p><p>Total: Rp${saleRes[0].grandTotal}</p>`;

			const success = await app.sendEmail(to, finalSubject, html);
			
			if (success) {
				return reply.send({ success: true, message: "Email berhasil dikirim (atau disimulasikan)" });
			} else {
				return reply.status(500).send({ success: false, error: { message: "Gagal mengirim email" } });
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal memproses Email";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});
}
