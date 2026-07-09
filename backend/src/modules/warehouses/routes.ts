import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { warehouses } from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

const createWarehouseSchema = z.object({
	name: z.string().min(1, "Nama gudang wajib diisi").max(255),
	address: z.string().nullable().optional(),
	is_default: z.boolean().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.extend({
	name: z.string().min(1).max(255).optional(),
	is_active: z.boolean().optional(),
});

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
			const { name, address, is_default } = createWarehouseSchema.parse(request.body);

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
			const { name, address, is_default, is_active } = updateWarehouseSchema.parse(request.body);

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
