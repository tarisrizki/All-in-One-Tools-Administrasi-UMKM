import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.dev.vars') });
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Fix the sales foreign key directly here so we don't have to deal with it later
  const res = await s.rpc('exec_sql', { sql_string: 'ALTER TABLE sales ADD CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id);' });
  console.log('FK fix:', res.error?.message || 'ok');
}
run();
