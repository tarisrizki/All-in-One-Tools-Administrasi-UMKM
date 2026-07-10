import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { suppliers } from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

const createSupplierSchema = z.object({
	name: z.string().min(1, "Nama supplier wajib diisi").max(255),
	contact_name: z.string().max(255).nullable().optional(),
	phone: z.string().max(30).nullable().optional(),
	address: z.string().nullable().optional(),
	email: z.string().max(255).nullable().optional(),
});

const updateSupplierSchema = createSupplierSchema.extend({
	name: z.string().min(1).max(255).optional(),
	is_active: z.boolean().optional(),
});

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
			const { name, contact_name, phone, address, email } = createSupplierSchema.parse(request.body);

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
			const { name, contact_name, phone, address, email, is_active } = updateSupplierSchema.parse(request.body);

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
