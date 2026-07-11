import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.dev.vars') });
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const r1 = await s.from('sales').select('*, customers(name)').limit(1);
  console.log('sales:', r1.error?.message || 'ok');
  
  const r2 = await s.from('purchase_orders').select('*, suppliers(name)').limit(1);
  console.log('purchase_orders:', r2.error?.message || 'ok');
  
  const r3 = await s.from('cashbook_entries').select('*').limit(1);
  console.log('cashbook:', r3.error?.message || 'ok');
  
  const r4 = await s.from('debts').select('*').limit(1);
  console.log('debts:', r4.error?.message || 'ok');
}
run();
