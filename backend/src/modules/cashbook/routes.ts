import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { cashbookEntries } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";

const cashbookSchema = z.object({
	type: z.enum(["in", "out"]),
	amount: z.number().min(1),
	description: z.string().min(1, "Deskripsi wajib diisi"),
});

export default async function cashbookRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.get("/", { preHandler: [app.requirePermission('cashbook.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;

			const result = await db.select()
				.from(cashbookEntries)
				.where(eq(cashbookEntries.businessId, businessId))
				.orderBy(desc(cashbookEntries.createdAt))
				.limit(100);

			return reply.send({ success: true, data: result });
		} catch (err: unknown) {
			app.log.error(err);
			return reply
				.status(500)
				.send({
					success: false,
					error: { message: "Gagal mengambil buku kas" },
				});
		}
	});

	app.post("/", { preHandler: [app.requirePermission('cashbook.write')] }, async (request, reply) => {
		try {
			const { businessId, userId } = request.user;
			const data = cashbookSchema.parse(request.body);

			const result = await db.insert(cashbookEntries).values({
				businessId,
				type: data.type,
				category: "Lainnya",
				amount: data.amount.toString(),
				note: data.description,
				createdBy: userId,
			}).returning();

			return reply.status(201).send({ success: true, data: result[0] });
		} catch (err: unknown) {
			app.log.error(err);
			const msg =
				err instanceof Error ? err.message : "Gagal menyimpan transaksi kas";
			return reply
				.status(400)
				.send({ success: false, error: { message: msg } });
		}
	});
}
