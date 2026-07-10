import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { db } from './drizzle.js';
import * as schema from '../db/schema.js';
import config from '../config/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      businessId: string;
      roleId: string;
    };
    user: {
      userId: string;
      businessId: string;
      roleId: string;
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(fastifyJwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.accessTokenExpiry,
    },
  });

	fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			await request.jwtVerify();
		} catch (err) {
			reply.send(err);
		}
	});

	fastify.decorate('requirePermission', (requiredPermission: string) => {
		return async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				await request.jwtVerify(); // Ensure user is authenticated

				const roleId = request.user.roleId;
				if (!roleId) throw new Error("No roleId in token");

				const { eq } = await import('drizzle-orm');
				const [role] = await db.select({ permissions: schema.roles.permissions }).from(schema.roles).where(eq(schema.roles.id, roleId));
				if (!role) {
					return reply.status(403).send({ success: false, error: { message: "Role tidak ditemukan" } });
				}

				const perms = Array.isArray(role.permissions) ? role.permissions : [];
				
				// Admin / Owner override
				if (perms.includes("*")) return;

				// Exact match
				if (perms.includes(requiredPermission)) return;

				// Prefix match (e.g., required: "products.read", has: "products")
				const baseModule = requiredPermission.split(".")[0];
				if (perms.includes(baseModule)) return;

				return reply.status(403).send({ success: false, error: { message: `Akses ditolak: membutuhkan izin '${requiredPermission}'` } });
			} catch (err) {
				return reply.status(401).send({ success: false, error: { message: "Sesi tidak valid" } });
			}
		};
	});
};

export default fp(authPlugin);
