import Fastify from 'fastify';
import cors from '@fastify/cors';
import config from './config/index.js';

// Import route modules
import authRoutes from './modules/auth/routes.js';
import productRoutes from './modules/products/routes.js';
import healthRoutes from './modules/health/routes.js';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// --- Plugins ---
await app.register(cors, {
  origin: config.cors.origin,
  credentials: true,
});

// --- Routes ---
await app.register(healthRoutes, { prefix: '/v1' });
await app.register(authRoutes, { prefix: '/v1/auth' });
await app.register(productRoutes, { prefix: '/v1/products' });

// --- Global error handler ---
app.setErrorHandler((error: any, request, reply) => {
  const statusCode = error.statusCode || 500;

  app.log.error(error);

  reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message:
        config.nodeEnv === 'production'
          ? 'Terjadi kesalahan pada server'
          : error.message,
    },
  });
});

// --- Start server ---
async function start() {
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Server berjalan di http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export default app;
