import { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { suppliers } from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

export default async function supplierRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('purchases.read')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;

			const result = await db.select()
				.from(suppliers)
				.where(eq(suppliers.businessId, businessId))
				.orderBy(asc(suppliers.name));

			return { success: true, data: result };
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('purchases.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { name, contact_name, phone, address, email } = request.body as any;

			if (!name) {
				return reply.status(400).send({
					success: false,
					error: { message: "Nama supplier wajib diisi" },
				});
			}

			const result = await db.insert(suppliers).values({
				businessId,
				name,
				contactName: contact_name,
				phone,
				address,
				email
			}).returning();

			return reply.status(201).send({ success: true, data: result[0] });
		},
	);

	fastify.put(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('purchases.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;
			const { name, contact_name, phone, address, email, is_active } = request.body as any;

			const updateData: any = { updatedAt: new Date().toISOString() };
			if (name !== undefined) updateData.name = name;
			if (contact_name !== undefined) updateData.contactName = contact_name;
			if (phone !== undefined) updateData.phone = phone;
			if (address !== undefined) updateData.address = address;
			if (email !== undefined) updateData.email = email;
			if (is_active !== undefined) updateData.isActive = is_active;

			const result = await db.update(suppliers)
				.set(updateData)
				.where(and(eq(suppliers.id, id), eq(suppliers.businessId, businessId)))
				.returning();

			if (result.length === 0) {
				return reply.status(404).send({
					success: false,
					error: { message: "Supplier tidak ditemukan" },
				});
			}

			return { success: true, data: result[0] };
		},
	);
}
