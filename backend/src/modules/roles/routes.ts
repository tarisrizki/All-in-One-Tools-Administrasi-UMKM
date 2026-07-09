import { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { roles, users } from "../../db/schema.js";
import { ne, eq, and, or, isNull, asc } from "drizzle-orm";
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
			const { businessId } = request.user as { businessId: string };

			// Dulu: mengembalikan SEMUA role di database tanpa filter business
			// sama sekali -- business A bisa lihat role custom milik business B.
			// Sekarang: role sistem (businessId NULL, dipakai bersama) + role
			// custom milik business yang login saja.
			const result = await db.select({
				id: roles.id,
				name: roles.name,
				description: roles.description,
				permissions: roles.permissions
			})
			.from(roles)
			.where(and(
				ne(roles.name, 'owner'),
				or(isNull(roles.businessId), eq(roles.businessId, businessId))
			))
			.orderBy(asc(roles.name));

			return { success: true, data: result };
		},
	);

	fastify.post(
		"/",
		{ preValidation: [fastify.authenticate, fastify.requirePermission('roles.manage')] },
		async (request, reply) => {
			try {
				const { businessId } = request.user as { businessId: string };
				const data = roleSchema.parse(request.body);
				const [newRole] = await db.insert(roles).values({
					businessId,
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
				const { businessId } = request.user as { businessId: string };
				const data = roleSchema.parse(request.body);
				
				// PENTING: role juga harus milik business yang sama dengan user yang
				// login. Sebelumnya query ini cuma cek eq(roles.id, id) -- artinya
				// siapa pun yang tahu/menebak UUID role bisnis LAIN bisa mengubahnya.
				const roleToUpdate = await db.query.roles.findFirst({ where: and(eq(roles.id, id), eq(roles.businessId, businessId)) });
				if (!roleToUpdate) throw new Error("Role tidak ditemukan");
				if (['owner', 'admin', 'cashier'].includes(roleToUpdate.name)) {
					throw new Error("Role bawaan sistem tidak dapat diubah");
				}

				const [updatedRole] = await db.update(roles).set({
					name: data.name,
					description: data.description,
					permissions: data.permissions
				}).where(and(eq(roles.id, id), eq(roles.businessId, businessId))).returning();

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
				const { businessId } = request.user as { businessId: string };
				
				// Sama seperti PUT di atas -- role harus dipastikan milik business
				// user yang login sebelum boleh dihapus.
				const roleToDelete = await db.query.roles.findFirst({ where: and(eq(roles.id, id), eq(roles.businessId, businessId)) });
				if (!roleToDelete) throw new Error("Role tidak ditemukan");
				if (['owner', 'admin', 'cashier'].includes(roleToDelete.name)) {
					throw new Error("Role bawaan sistem tidak dapat dihapus");
				}

				// Check if role is in use (dibatasi ke business yang sama juga)
				const usersWithRole = await db.select({ id: users.id }).from(users).where(and(eq(users.roleId, id), eq(users.businessId, businessId))).limit(1);
				if (usersWithRole.length > 0) {
					throw new Error("Tidak dapat menghapus role yang sedang digunakan oleh karyawan");
				}

				await db.delete(roles).where(and(eq(roles.id, id), eq(roles.businessId, businessId)));

				return reply.send({ success: true, message: "Role berhasil dihapus" });
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Gagal menghapus role";
				return reply.status(400).send({ success: false, error: { message: msg } });
			}
		}
	);
}
