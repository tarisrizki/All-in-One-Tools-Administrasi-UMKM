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

  console.log("Menginjeksi transaksi penjualan (Sales)...");
  
  // Inject Sales
  for (let i = 0; i < 5; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    const p = products[Math.floor(Math.random() * products.length)];
    const c = customers && customers.length > 0 ? customers[Math.floor(Math.random() * customers.length)] : null;
    
    const qty = Math.floor(Math.random() * 3) + 1;
    const price = parseFloat(p.sell_price);
    const total = qty * price;
    
    const { data: sale } = await supabase.from('sales').insert({
        business_id: demoBusinessId,
        warehouse_id: warehouseId,
        client_transaction_id: randomUUID(),
        invoice_number: `INV/DEMO/${Date.now()}-${i}`,
        status: "paid",
        subtotal: total,
        discount_total: 0,
        grand_total: total,
        created_by: demoUserId,
        created_at: date.toISOString()
    }).select().single();
    
    if (sale) {
        await supabase.from('sale_items').insert({
            sale_id: sale.id,
            product_id: p.id,
            qty: qty,
            price: price,
            discount: 0
        });

        await supabase.from('payments').insert({
            sale_id: sale.id,
            method: 'cash',
            amount: total
        });
        
        await supabase.from('cashbook_entries').insert({
            business_id: demoBusinessId,
            type: 'income',
            category: 'Penjualan',
            amount: total,
            date: date.toISOString(),
            description: `Penjualan ${sale.invoice_number}`,
            created_by: demoUserId,
            created_at: date.toISOString()
        });
    }
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
          
          const { data: po } = await supabase.from('purchase_orders').insert({
              business_id: demoBusinessId,
              supplier_id: s.id,
              warehouse_id: warehouseId,
              po_number: `PO/DEMO/${Date.now()}-${i}`,
              status: "completed",
              subtotal: total,
              grand_total: total,
              created_by: demoUserId,
              created_at: date.toISOString(),
              updated_at: date.toISOString()
          }).select().single();

          if (po) {
              await supabase.from('purchase_order_items').insert({
                  purchase_order_id: po.id,
                  product_id: p.id,
                  qty: qty,
                  cost_price: price,
                  total_price: total
              });
              
              await supabase.from('cashbook_entries').insert({
                  business_id: demoBusinessId,
                  type: 'expense',
                  category: 'Pembelian',
                  amount: total,
                  date: date.toISOString(),
                  description: `Pembelian PO ${po.po_number}`,
                  created_by: demoUserId,
                  created_at: date.toISOString()
              });
          }
      }
  }

  console.log("Menginjeksi data hutang/piutang (Debts)...");
  await supabase.from('debts').insert({
      business_id: demoBusinessId,
      type: 'hutang',
      entity_name: 'Toko Kemasan Plastik',
      amount: 150000,
      remaining_amount: 150000,
      status: 'unpaid',
      notes: 'Pembelian stok gelas plastik',
      due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      created_by: demoUserId
  });

  console.log('✅ Demo data lengkap berhasil diinjeksi!');
}

injectRichDemoData();
