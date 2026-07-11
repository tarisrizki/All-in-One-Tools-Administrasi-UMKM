import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.dev.vars') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .dev.vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function injectRichDemoData() {
  console.log("Mencari akun pengguna demo (08123456789)...");
  
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, business_id, role_id')
    .eq('phone', '08123456789')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error("User demo tidak ditemukan atau terjadi error:", userError?.message);
    return;
  }

  const demoUser = users[0];
  const demoUserId = demoUser.id;
  const demoBusinessId = demoUser.business_id;

  const { data: warehouse } = await supabase.from('warehouses').select('id').eq('business_id', demoBusinessId).limit(1).single();
  const warehouseId = warehouse?.id;
  if (!warehouseId) {
    console.error("Gudang tidak ditemukan, jalankan fix-demo.ts dulu.");
    return;
  }

  const { data: products } = await supabase.from('products').select('id, name, sell_price, cost_price').eq('business_id', demoBusinessId);
  const { data: customers } = await supabase.from('customers').select('id, name').eq('business_id', demoBusinessId);
  const { data: suppliers } = await supabase.from('suppliers').select('id, name').eq('business_id', demoBusinessId);

  if (!products || products.length === 0) {
      console.error("Products not found, exiting.");
      return;
  }

  console.log("Menginjeksi data PO (Purchases)...");
  if (suppliers && suppliers.length > 0) {
      for (let i = 0; i < 2; i++) {
          const daysAgo = Math.floor(Math.random() * 7) + 2;
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          
          const s = suppliers[Math.floor(Math.random() * suppliers.length)];
          const p = products[Math.floor(Math.random() * products.length)];
          const qty = 10;
          const price = parseFloat(p.cost_price);
          const total = qty * price;
          
          const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
              business_id: demoBusinessId,
              supplier_id: s.id,
              warehouse_id: warehouseId,
              po_number: `PO/DEMO/${Date.now()}-${i}`,
              status: "completed",
              total_amount: total.toString(),
              created_by: demoUserId,
              created_at: date.toISOString(),
              updated_at: date.toISOString()
          }).select().single();
          
          if (poErr) console.error("PO Err:", poErr);

          if (po) {
              const { error: piErr } = await supabase.from('purchase_order_items').insert({
                  po_id: po.id,
                  product_id: p.id,
                  qty: qty,
                  cost_price: price.toString()
              });
              if (piErr) console.error("PO Item Err:", piErr);
              
              const { error: cbErr } = await supabase.from('cashbook_entries').insert({
                  business_id: demoBusinessId,
                  type: 'expense',
                  category: 'Pembelian',
                  amount: total.toString(),
                  note: `Pembelian PO ${po.po_number}`,
                  created_by: demoUserId,
                  created_at: date.toISOString()
              });
              if (cbErr) console.error("CB Err:", cbErr);
          }
      }
  }

  console.log('✅ Demo data lengkap berhasil diinjeksi ulang (PO & Cashbook)!');
}

injectRichDemoData();
