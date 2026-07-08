import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
};

export default fp(authPlugin);
