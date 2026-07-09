import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "../../plugins/drizzle.js";
import { users, roles } from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

const employeeCreateSchema = z.object({
	name: z.string().min(1, "Nama wajib diisi").max(255),
	phone: z.string().min(1, "Nomor HP wajib diisi").max(30),
	password: z.string().min(6, "Password minimal 6 karakter").max(255),
	role_id: z.string().uuid("Role ID tidak valid"),
});

const employeeUpdateStatusSchema = z.object({
	is_active: z.boolean(),
});

export default async function employeeRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('employees')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;

			const result = await db.select({
				id: users.id,
				name: users.name,
				phone: users.phone,
				email: users.email,
				is_active: users.isActive,
				role_name: roles.name,
				role_id: roles.id
			})
			.from(users)
			.innerJoin(roles, eq(users.roleId, roles.id))
			.where(eq(users.businessId, businessId))
			.orderBy(asc(users.createdAt));

			return { success: true, data: result };
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('employees')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { name, phone, password, role_id } = employeeCreateSchema.parse(request.body);

			try {
				const salt = await bcrypt.genSalt(10);
				const passwordHash = await bcrypt.hash(password, salt);

				const result = await db.insert(users).values({
					businessId,
					roleId: role_id,
					name,
					phone,
					passwordHash
				}).returning({ id: users.id, name: users.name, phone: users.phone });

				return reply.status(201).send({ success: true, data: result[0] });
			} catch (e: any) {
				if (e.code === "23505") {
					return reply.status(400).send({
						success: false,
						error: { message: "Nomor HP sudah terdaftar" },
					});
				}
				throw e;
			}
		},
	);

	fastify.put(
		"/:id/status",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('employees')] },
		async (request, reply) => {
			const user = request.user as any;
			const businessId = user.businessId;
			const { id } = request.params as any;
			const { is_active } = employeeUpdateStatusSchema.parse(request.body);

			if (id === user.userId) {
				return reply.status(400).send({
					success: false,
					error: { message: "Tidak dapat menonaktifkan akun sendiri" },
				});
			}

			const result = await db.update(users)
				.set({
					isActive: is_active,
					updatedAt: new Date().toISOString()
				})
				.where(and(eq(users.id, id), eq(users.businessId, businessId)))
				.returning({ id: users.id, is_active: users.isActive });

			if (result.length === 0) {
				return reply.status(404).send({
					success: false,
					error: { message: "Karyawan tidak ditemukan" },
				});
			}

			return { success: true, data: result[0] };
		},
	);
}
