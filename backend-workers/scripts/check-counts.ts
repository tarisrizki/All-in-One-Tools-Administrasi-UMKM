import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.dev.vars') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const { data: users } = await supabase.from('users').select('id, business_id').eq('phone', '08123456789').limit(1);
  if (!users || users.length === 0) return console.log('no user');
  const bid = users[0].business_id;

  const { count: sCount } = await supabase.from('sales').select('id', { count: 'exact', head: true }).eq('business_id', bid);
  const { count: pCount } = await supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('business_id', bid);
  const { count: cCount } = await supabase.from('cashbook_entries').select('id', { count: 'exact', head: true }).eq('business_id', bid);
  const { count: dCount } = await supabase.from('debts').select('id', { count: 'exact', head: true }).eq('business_id', bid);

  console.log(`Sales: ${sCount}, PO: ${pCount}, Cashbook: ${cCount}, Debts: ${dCount}`);
}
check();
