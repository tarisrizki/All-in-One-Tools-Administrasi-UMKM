import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.dev.vars') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const { data: users } = await supabase.from('users').select('id, business_id').eq('phone', '08123456789').limit(1);
  const bid = users![0].business_id;

  const { error: poErr } = await supabase.from('purchase_orders').insert({
    business_id: bid,
    supplier_id: null,
    warehouse_id: null,
    po_number: 'test'
  });
  console.log('PO error:', poErr);

  const { error: cErr } = await supabase.from('cashbook_entries').insert({
    business_id: bid,
    type: 'income',
    category: 'Test',
    amount: 10,
    date: new Date().toISOString()
  });
  console.log('Cashbook error:', cErr);
}
check();
