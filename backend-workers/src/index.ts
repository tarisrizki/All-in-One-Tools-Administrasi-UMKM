import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoute } from './modules/health';
import { categoriesRoute } from './modules/categories';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'x-business-id', 'x-user-id'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Global error handler
app.onError((err, c) => {
  console.error(`[Error] ${err.message}`);
  return c.json({ success: false, error: { message: 'Terjadi kesalahan internal server' } }, 500);
});

// Route registration
app.route('/health', healthRoute);
app.route('/categories', categoriesRoute);

export default app;
