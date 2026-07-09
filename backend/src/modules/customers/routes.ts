import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { eq, and, or, ilike, asc, sql, getTableColumns } from "drizzle-orm";
import { sales, customers } from "../../db/schema.js";

const customerSchema = z.object({
	name: z.string().min(1, "Nama pelanggan wajib diisi").max(255),
	phone: z.string().max(30).nullable().optional(),
	email: z.string().max(255).nullable().optional(),
	address: z.string().nullable().optional(),
});

export default async function customerRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('customers.read')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { search } = request.query as any;

			let conditions = eq(customers.businessId, businessId);
			if (search) {
				const searchTerm = `%${search}%`;
				conditions = and(
					conditions,
					or(
						ilike(customers.name, searchTerm),
						ilike(customers.phone, searchTerm),
						ilike(customers.email, searchTerm)
					)
				) as any;
			}

			const rawResult = await db.select({
				...getTableColumns(customers),
				totalSpent: sql<number>`COALESCE(SUM(${sales.grandTotal}), 0)`.mapWith(Number)
			})
				.from(customers)
				.leftJoin(sales, and(eq(sales.customerId, customers.id), eq(sales.status, 'paid')))
				.where(conditions)
				.groupBy(customers.id)
				.orderBy(asc(customers.name));
				
			const result = rawResult.map(c => {
				let tier = 'Reguler';
				if (c.totalSpent >= 5000000) tier = 'Gold';
				else if (c.totalSpent >= 1000000) tier = 'Silver';
				
				return { ...c, tier };
			});

			return { success: true, data: result };
		},
	);

	fastify.get(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('customers.read')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;

			const rawResult = await db.select({
				...getTableColumns(customers),
				totalSpent: sql<number>`COALESCE(SUM(${sales.grandTotal}), 0)`.mapWith(Number)
			})
				.from(customers)
				.leftJoin(sales, and(eq(sales.customerId, customers.id), eq(sales.status, 'paid')))
				.where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
				.groupBy(customers.id);

			if (rawResult.length === 0) {
				return reply.status(404).send({
					success: false,
					error: { message: "Pelanggan tidak ditemukan" },
				});
			}

			const c = rawResult[0];
			let tier = 'Reguler';
			if (c.totalSpent >= 5000000) tier = 'Gold';
			else if (c.totalSpent >= 1000000) tier = 'Silver';

			return { success: true, data: { ...c, tier } };
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('customers.write')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { name, phone, email, address } = customerSchema.parse(request.body);

			const result = await db.insert(customers).values({
				businessId,
				name,
				phone: phone || null,
				email: email || null,
				address: address || null,
				createdBy: user.id,
			}).returning();

			return reply.status(201).send({ success: true, data: result[0] });
		},
	);

	fastify.put(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('customers.write')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;
			const { name, phone, email, address } = customerSchema.parse(request.body);

			const result = await db.update(customers)
				.set({
					name,
					phone: phone || null,
					email: email || null,
					address: address || null,
					updatedAt: new Date().toISOString(),
				})
				.where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
				.returning();

			if (result.length === 0) {
				return reply.status(404).send({
					success: false,
					error: { message: "Pelanggan tidak ditemukan" },
				});
			}

			return { success: true, data: result[0] };
		},
	);
}
