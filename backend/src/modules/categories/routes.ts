import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { categories } from "../../db/schema.js";
import { eq, asc, desc } from "drizzle-orm";

const categorySchema = z.object({
	name: z.string().min(2),
	description: z.string().optional(),
});

export default async function categoryRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.get("/", { preHandler: [app.requirePermission('products.read')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;

			const result = await db.select()
				.from(categories)
				.where(eq(categories.businessId, businessId))
				.orderBy(asc(categories.sortOrder), desc(categories.createdAt));

			return reply.send({ success: true, data: result });
		} catch (err: unknown) {
			app.log.error(err);
			return reply
				.status(500)
				.send({
					success: false,
					error: { message: "Gagal mengambil kategori" },
				});
		}
	});

	app.post("/", { preHandler: [app.requirePermission('products.write')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			const { name, description } = categorySchema.parse(request.body);

			const result = await db.insert(categories)
				.values({
					businessId,
					name,
					description: description || null,
				})
				.returning();

			return reply.status(201).send({ success: true, data: result[0] });
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Gagal menyimpan kategori";
			return reply
				.status(400)
				.send({ success: false, error: { message: msg } });
		}
	});
}
