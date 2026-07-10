import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "../../plugins/drizzle.js";
import { users, roles, businesses, warehouses, categories } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const registerSchema = z.object({
	phone: z.string().min(10).max(30),
	password: z.string().min(6).max(255),
	businessName: z.string().min(2).max(255),
});

const loginSchema = z.object({
	phone: z.string().min(10).max(30),
	password: z.string().min(6).max(255),
});

export default async function authRoutes(app: FastifyInstance) {
	app.post("/register", {
		config: {
			rateLimit: { max: 5, timeWindow: "1 minute" }
		}
	}, async (request, reply) => {
		const { phone, password, businessName } = registerSchema.parse(request.body);
		try {
			const data = await db.transaction(async (tx) => {
				const existingUser = await tx.select({ id: users.id }).from(users).where(eq(users.phone, phone));
				if (existingUser.length > 0) throw new Error("Nomor HP sudah terdaftar");

				const roleRes = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, "owner"));
				if (roleRes.length === 0) throw new Error("Role owner tidak ditemukan di database");
				const ownerRoleId = roleRes[0].id;

				const [business] = await tx.insert(businesses).values({ name: businessName }).returning({ id: businesses.id });
				const businessId = business.id;

				const salt = await bcrypt.genSalt(10);
				const passwordHash = await bcrypt.hash(password, salt);
				const [user] = await tx.insert(users).values({
					businessId,
					roleId: ownerRoleId,
					name: "Owner",
					phone,
					passwordHash
				}).returning({ id: users.id });
				const userId = user.id;

				await tx.insert(warehouses).values({
					businessId,
					name: "Gudang Utama",
					isDefault: true
				});

				await tx.insert(categories).values({
					businessId,
					name: "Umum",
					description: "Kategori default"
				});

				return { userId, businessId, ownerRoleId };
			});

			const token = app.jwt.sign({ userId: data.userId, businessId: data.businessId, roleId: data.ownerRoleId });

			return reply.status(201).send({
				success: true,
				data: { token, userId: data.userId, businessId: data.businessId },
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Gagal mendaftar";
			return reply.status(400).send({
				success: false,
				error: { code: "REGISTER_FAILED", message },
			});
		}
	});

	// Login dibatasi lebih ketat dari default global -- ini titik paling rawan
	// dicoba brute-force (tebak nomor HP + password).
	app.post("/login", {
		config: {
			rateLimit: { max: 8, timeWindow: "1 minute" }
		}
	}, async (request, reply) => {
		try {
			const { phone, password } = loginSchema.parse(request.body);
			
			const userRes = await db.select().from(users).where(eq(users.phone, phone));

			if (userRes.length === 0) {
				return reply.status(401).send({ success: false, error: { code: "UNAUTHORIZED", message: "Nomor HP atau kata sandi salah" } });
			}

			const user = userRes[0];
			const match = await bcrypt.compare(password, user.passwordHash as string);

			if (!match) {
				return reply.status(401).send({ success: false, error: { code: "UNAUTHORIZED", message: "Nomor HP atau kata sandi salah" } });
			}

			const token = app.jwt.sign({
				userId: user.id,
				businessId: user.businessId,
				roleId: user.roleId,
			});

			return reply.send({ success: true, data: { token, userId: user.id, businessId: user.businessId } });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Gagal masuk";
			return reply.status(400).send({ success: false, error: { code: "LOGIN_FAILED", message } });
		}
	});

	app.get(
		"/me",
		{ preValidation: [app.authenticate] },
		async (request, reply) => {
			try {
				const { userId } = request.user;
				
				const userRes = await db.select({
					id: users.id,
					name: users.name,
					phone: users.phone,
					business_name: businesses.name,
					role_name: roles.name,
					permissions: roles.permissions
				})
				.from(users)
				.innerJoin(businesses, eq(users.businessId, businesses.id))
				.innerJoin(roles, eq(users.roleId, roles.id))
				.where(eq(users.id, userId));

				if (userRes.length === 0) {
					return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Pengguna tidak ditemukan" } });
				}

				return reply.send({ success: true, data: userRes[0] });
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Terjadi kesalahan";
				return reply.status(400).send({ success: false, error: { code: "FETCH_ME_FAILED", message } });
			}
		},
	);

	app.post("/refresh", async (_request, reply) => {
		return reply.status(501).send({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Refresh token belum diimplementasi" } });
	});

	app.post("/logout", async (_request, reply) => {
		return reply.status(200).send({ success: true, message: "Logout berhasil, hapus token di client" });
	});
}
