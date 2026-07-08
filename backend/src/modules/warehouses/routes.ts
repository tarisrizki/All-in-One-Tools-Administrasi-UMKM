import { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { warehouses } from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

export default async function warehouseRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('settings.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;

			const result = await db.select()
				.from(warehouses)
				.where(eq(warehouses.businessId, businessId))
				.orderBy(asc(warehouses.createdAt));

			return { success: true, data: result };
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('settings.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { name, address, is_default } = request.body as any;

			if (!name) {
				return reply.status(400).send({
					success: false,
					error: { message: "Nama gudang wajib diisi" },
				});
			}

			const result = await db.insert(warehouses).values({
				businessId,
				name,
				address,
				isDefault: is_default || false,
			}).returning();

			return reply.status(201).send({ success: true, data: result[0] });
		},
	);

	fastify.put(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('settings.manage')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;
			const { name, address, is_default, is_active } = request.body as any;

			const updateData: any = { updatedAt: new Date().toISOString() };
			if (name !== undefined) updateData.name = name;
			if (address !== undefined) updateData.address = address;
			if (is_default !== undefined) updateData.isDefault = is_default;
			if (is_active !== undefined) updateData.isActive = is_active;

			const result = await db.update(warehouses)
				.set(updateData)
				.where(and(eq(warehouses.id, id), eq(warehouses.businessId, businessId)))
				.returning();

			if (result.length === 0) {
				return reply.status(404).send({
					success: false,
					error: { message: "Gudang tidak ditemukan" },
				});
			}

			return { success: true, data: result[0] };
		},
	);
}
