import { Hono } from 'hono';
import { getSupabase } from './utils/supabase';
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
import { rolesRoute } from './modules/roles';
import { settingsRoute } from './modules/settings';
import { authRoute } from './modules/auth';
import { syncRoute } from './modules/sync';
import { backupRoute } from './modules/backup';
import { aiRoute } from './modules/ai';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Module Health (Worker status & DB connection)
app.get('/health', async (c) => {
  const supabase = getSupabase(c.env);
  
  try {
    // Simple query to verify connection
    const { data, error } = await supabase.from('businesses').select('id').limit(1);
    
    if (error) throw error;
    
    return c.json({
      status: 'ok',
      service: 'umkm-backend-workers',
      db: 'connected'
    });
  } catch (err: any) {
    return c.json({
      status: 'error',
      service: 'umkm-backend-workers',
      db: 'disconnected',
      message: err.message
    }, 500);
  }
});

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
app.route('/roles', rolesRoute);
app.route('/settings', settingsRoute);
app.route('/auth', authRoute);
app.route('/sync', syncRoute);
app.route('/backup', backupRoute);
app.route('/ai', aiRoute);

export default app;
