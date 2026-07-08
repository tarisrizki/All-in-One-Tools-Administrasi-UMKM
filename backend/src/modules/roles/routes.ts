import { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { roles, users } from "../../db/schema.js";
import { ne, eq, asc } from "drizzle-orm";
import { z } from "zod";

const roleSchema = z.object({
	name: z.string().min(2),
	description: z.string().optional(),
	permissions: z.array(z.string())
});

export default async function rolesRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('roles.manage')] },
		async (request, reply) => {
			const result = await db.select({
				id: roles.id,
				name: roles.name,
				description: roles.description,
				permissions: roles.permissions
			})
			.from(roles)
			.where(ne(roles.name, 'owner'))
			.orderBy(asc(roles.name));

			return { success: true, data: result };
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('roles.manage')] },
		async (request, reply) => {
			try {
				const data = roleSchema.parse(request.body);
				const [newRole] = await db.insert(roles).values({
					name: data.name,
					description: data.description,
					permissions: data.permissions
				}).returning();

				return reply.status(201).send({ success: true, data: newRole });
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Gagal membuat role";
				return reply.status(400).send({ success: false, error: { message: msg } });
			}
		}
	);

	fastify.put(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('roles.manage')] },
		async (request, reply) => {
			try {
				const { id } = request.params as { id: string };
				const data = roleSchema.parse(request.body);
				
				// Prevent updating built-in roles
				const roleToUpdate = await db.query.roles.findFirst({ where: eq(roles.id, id) });
				if (!roleToUpdate) throw new Error("Role tidak ditemukan");
				if (['owner', 'admin', 'cashier'].includes(roleToUpdate.name)) {
					throw new Error("Role bawaan sistem tidak dapat diubah");
				}

				const [updatedRole] = await db.update(roles).set({
					name: data.name,
					description: data.description,
					permissions: data.permissions
				}).where(eq(roles.id, id)).returning();

				return reply.send({ success: true, data: updatedRole });
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Gagal mengubah role";
				return reply.status(400).send({ success: false, error: { message: msg } });
			}
		}
	);

	fastify.delete(
		"/:id",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('roles.manage')] },
		async (request, reply) => {
			try {
				const { id } = request.params as { id: string };
				
				// Prevent deleting built-in roles
				const roleToDelete = await db.query.roles.findFirst({ where: eq(roles.id, id) });
				if (!roleToDelete) throw new Error("Role tidak ditemukan");
				if (['owner', 'admin', 'cashier'].includes(roleToDelete.name)) {
					throw new Error("Role bawaan sistem tidak dapat dihapus");
				}

				// Check if role is in use
				const usersWithRole = await db.select({ id: users.id }).from(users).where(eq(users.roleId, id)).limit(1);
				if (usersWithRole.length > 0) {
					throw new Error("Tidak dapat menghapus role yang sedang digunakan oleh karyawan");
				}

				await db.delete(roles).where(eq(roles.id, id));

				return reply.send({ success: true, message: "Role berhasil dihapus" });
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Gagal menghapus role";
				return reply.status(400).send({ success: false, error: { message: msg } });
			}
		}
	);
}
