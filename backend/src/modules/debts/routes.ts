import { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { debts, debtPayments } from "../../db/schema.js";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export default async function debtsRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('debts.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { type, status } = request.query as any;

			let conditions = [eq(debts.businessId, businessId)];
			if (type) conditions.push(eq(debts.type, type));
			if (status) conditions.push(eq(debts.status, status));

			const result = await db.select()
				.from(debts)
				.where(and(...conditions))
				// Using raw sql for order by due_date ASC NULLS LAST
				.orderBy(sql`${debts.dueDate} ASC NULLS LAST`, desc(debts.createdAt));

			return { success: true, data: result };
		},
	);

	fastify.delete(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('debts.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const { id } = request.params as any;

			// Dulu: debtPayments dihapus duluan tanpa cek businessId sama sekali --
			// artinya siapa pun yang tahu/menebak UUID hutang milik business LAIN
			// bisa menghapus riwayat pembayarannya (baris debts sendiri sudah aman,
			// tapi child table-nya tidak). Sekarang verifikasi kepemilikan dulu.
			const debtRes = await db.select({ id: debts.id }).from(debts).where(and(eq(debts.id, id), eq(debts.businessId, user.businessId)));
			if (debtRes.length === 0) {
				return reply.status(404).send({ success: false, error: { message: "Data tidak ditemukan" } });
			}

			await db.delete(debtPayments).where(eq(debtPayments.debtId, id));
			await db.delete(debts).where(and(eq(debts.id, id), eq(debts.businessId, user.businessId)));

			return reply.send({ success: true, message: "Hutang/Piutang berhasil dihapus" });
		}
	);

	fastify.post(
		"/:id/remind",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('debts.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const { id } = request.params as any;

			const debtRes = await db.select().from(debts).where(and(eq(debts.id, id), eq(debts.businessId, user.businessId))).limit(1);
			if (debtRes.length === 0) {
				return reply.status(404).send({ success: false, error: { message: "Data tidak ditemukan" } });
			}

			const debt = debtRes[0];
			if (!debt.entityPhone) {
				return reply.status(400).send({ success: false, error: { message: "Nomor telepon pelanggan/supplier tidak tersedia" } });
			}

			if (debt.status === 'paid') {
				return reply.status(400).send({ success: false, error: { message: "Tagihan ini sudah lunas" } });
			}

			const labelTagihan = debt.type === 'piutang' ? 'Tagihan Piutang' : 'Peringatan Hutang';
			const msg = `Halo ${debt.entityName},\n\nIni adalah pengingat untuk ${labelTagihan} Anda sejumlah Rp${debt.remainingAmount}.\nJatuh tempo pada: ${new Date(debt.dueDate as string).toLocaleDateString('id-ID')}.\n\nMohon segera diselesaikan. Terima kasih!`;

			const success = await fastify.sendWhatsAppMessage(debt.entityPhone, msg);

			if (success) {
				return reply.send({ success: true, message: "Pengingat WA berhasil dikirim" });
			} else {
				return reply.status(500).send({ success: false, error: { message: "Gagal mengirim pengingat via WhatsApp" } });
			}
		}
	);

	fastify.get(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('debts.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;

			const debtRes = await db.select().from(debts).where(and(eq(debts.id, id), eq(debts.businessId, businessId)));

			if (debtRes.length === 0) {
				return reply.status(404).send({ success: false, error: { message: "Data tidak ditemukan" } });
			}

			const paymentsRes = await db.select()
				.from(debtPayments)
				.where(eq(debtPayments.debtId, id))
				.orderBy(desc(debtPayments.paymentDate));

			return {
				success: true,
				data: {
					...debtRes[0],
					payments: paymentsRes,
				},
			};
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('debts.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { type, entity_name, entity_phone, amount, due_date, notes } = request.body as any;

			if (!type || !entity_name || !amount) {
				return reply.status(400).send({ success: false, error: { message: "Data tidak lengkap" } });
			}

			const result = await db.insert(debts).values({
				businessId,
				type,
				entityName: entity_name,
				entityPhone: entity_phone || null,
				amount: amount.toString(),
				remainingAmount: amount.toString(),
				dueDate: due_date ? new Date(due_date).toISOString() : null,
				notes: notes || null,
				createdBy: user.id,
			}).returning();

			return reply.status(201).send({ success: true, data: result[0] });
		},
	);

	fastify.post(
		"/:id/payments",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('debts.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;
			const { amount, payment_method, notes } = request.body as any;

			if (!amount || amount <= 0) {
				return reply.status(400).send({ success: false, error: { message: "Nominal pembayaran tidak valid" } });
			}

			try {
				const updatedDebtRes = await db.transaction(async (tx) => {
					const debtRes = await tx.select().from(debts).where(and(eq(debts.id, id), eq(debts.businessId, businessId)));

					if (debtRes.length === 0) {
						throw new Error("Data tidak ditemukan");
					}

					const debt = debtRes[0];
					const currentRemaining = parseFloat(debt.remainingAmount as string);
					const currentAmount = parseFloat(debt.amount as string);

					if (debt.status === "paid" || currentRemaining <= 0) {
						throw new Error("Tagihan sudah lunas");
					}

					let paymentAmount = amount;
					if (paymentAmount > currentRemaining) {
						paymentAmount = currentRemaining;
					}

					const newRemaining = currentRemaining - paymentAmount;
					let newStatus = debt.status;

					if (newRemaining <= 0) {
						newStatus = "paid";
					} else if (newRemaining < currentAmount) {
						newStatus = "partial";
					}

					await tx.insert(debtPayments).values({
						debtId: id,
						amount: paymentAmount.toString(),
						paymentMethod: payment_method || "cash",
						notes: notes || null,
						createdBy: user.id,
					});

					const [updatedDebt] = await tx.update(debts)
						.set({ remainingAmount: newRemaining.toString(), status: newStatus as any, updatedAt: new Date().toISOString() })
						.where(eq(debts.id, id))
						.returning();

					return updatedDebt;
				});

				return reply.send({ success: true, data: updatedDebtRes });
			} catch (error: any) {
				const statusMap: Record<string, number> = { "Data tidak ditemukan": 404, "Tagihan sudah lunas": 400 };
				if (statusMap[error.message]) {
					return reply.status(statusMap[error.message]).send({ success: false, error: { message: error.message } });
				}
				throw error;
			}
		},
	);

}
