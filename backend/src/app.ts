import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import config from './config/index.js';

// Import route modules
import authPlugin from './plugins/auth.js';
import authRoutes from './modules/auth/routes.js';
import productRoutes from './modules/products/routes.js';
import categoryRoutes from './modules/categories/routes.js';
import salesRoutes from './modules/sales/routes.js';
import cashbookRoutes from './modules/cashbook/routes.js';
import reportRoutes from './modules/reports/routes.js';
import healthRoutes from './modules/health/routes.js';
import warehouseRoutes from './modules/warehouses/routes.js';
import supplierRoutes from './modules/suppliers/routes.js';
import purchaseRoutes from './modules/purchases/routes.js';
import debtsRoutes from './modules/debts/routes.js';
import customerRoutes from './modules/customers/routes.js';
import employeeRoutes from './modules/employees/routes.js';
import roleRoutes from './modules/roles/routes.js';

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
await app.register(authPlugin);

// --- Routes ---
await app.register(healthRoutes, { prefix: '/v1' });
await app.register(authRoutes, { prefix: '/v1/auth' });
await app.register(productRoutes, { prefix: '/v1/products' });
await app.register(categoryRoutes, { prefix: '/v1/categories' });
await app.register(salesRoutes, { prefix: '/v1/sales' });
await app.register(cashbookRoutes, { prefix: '/v1/cashbook' });
await app.register(reportRoutes, { prefix: '/v1/reports' });
await app.register(warehouseRoutes, { prefix: '/v1/warehouses' });
await app.register(supplierRoutes, { prefix: '/v1/suppliers' });
await app.register(purchaseRoutes, { prefix: '/v1/purchase-orders' });
await app.register(debtsRoutes, { prefix: '/v1/debts' });
await app.register(customerRoutes, { prefix: '/v1/customers' });
await app.register(employeeRoutes, { prefix: '/v1/employees' });
await app.register(roleRoutes, { prefix: '/v1/roles' });

// --- Global error handler ---
app.setErrorHandler((error: FastifyError, request, reply) => {
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
