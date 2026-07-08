import { FastifyInstance } from 'fastify';

/**
 * Auth routes — POST /v1/auth/login, /register, /refresh, /logout
 * Placeholder for Sprint S1 implementation.
 */
export default async function authRoutes(app: FastifyInstance) {
  // POST /v1/auth/login
  app.post('/login', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Login akan diimplementasi di Sprint S1',
      },
    });
  });

  // POST /v1/auth/register
  app.post('/register', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Registrasi akan diimplementasi di Sprint S1',
      },
    });
  });

  // POST /v1/auth/refresh
  app.post('/refresh', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Refresh token akan diimplementasi di Sprint S1',
      },
    });
  });

  // POST /v1/auth/logout
  app.post('/logout', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Logout akan diimplementasi di Sprint S1',
      },
    });
  });
}
