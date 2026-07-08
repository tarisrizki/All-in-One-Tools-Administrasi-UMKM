import { FastifyInstance } from 'fastify';

/**
 * Health check endpoint — used by monitoring (Uptime Kuma) and deployment health checks.
 * See Deployment & Maintenance Plan §03.
 */
export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        uptime: process.uptime(),
      },
    });
  });
}
