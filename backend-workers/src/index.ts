import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoute } from './modules/health';
import { categoriesRoute } from './modules/categories';
import { warehousesRoute } from './modules/warehouses';
import { suppliersRoute } from './modules/suppliers';
import { employeesRoute } from './modules/employees';
import { customersRoute } from './modules/customers';
import { productsRoute } from './modules/products';
import { salesRoute } from './modules/sales';
import { cashbookRoute } from './modules/cashbook';
import { debtsRoute } from './modules/debts';
import { purchasesRoute } from './modules/purchases';
import { reportsRoute } from './modules/reports';

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
app.route('/warehouses', warehousesRoute);
app.route('/suppliers', suppliersRoute);
app.route('/employees', employeesRoute);
app.route('/customers', customersRoute);
app.route('/products', productsRoute);
app.route('/sales', salesRoute);
app.route('/cashbook', cashbookRoute);
app.route('/debts', debtsRoute);
app.route('/purchases', purchasesRoute);
app.route('/reports', reportsRoute);

export default app;
