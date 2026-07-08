import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../../plugins/drizzle.js";
import { users, roles } from "../../db/schema.js";
import { eq, and, asc } from "drizzle-orm";

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
			const { name, phone, password, role_id } = request.body as any;

			if (!name || !phone || !password || !role_id) {
				return reply.status(400).send({
					success: false,
					error: { message: "Semua kolom wajib diisi (Nama, Nomor HP, Password, Peran)" },
				});
			}

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
			const { is_active } = request.body as any;

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
