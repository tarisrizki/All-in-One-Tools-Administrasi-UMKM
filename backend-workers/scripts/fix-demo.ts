import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.dev.vars') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .dev.vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDemoAccount() {
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
  console.log("User demo ditemukan. ID:", demoUserId, "Business ID:", demoBusinessId);

  if (!demoBusinessId) {
    console.error("User demo tidak memiliki business_id.");
    return;
  }

  // Set is_demo = true
  await supabase.from('businesses').update({ is_demo: true }).eq('id', demoBusinessId);
  console.log("✅ is_demo telah di-set menjadi true untuk bisnis demo!");
  
  // Beri izin 'Full Access' ke role
  await supabase.from('roles').update({ permissions: ['*'] }).eq('id', demoUser.role_id);
  console.log("✅ Akses Full [*] diberikan ke role user");

  // Pastikan ada warehouse
  let defaultWarehouseId = '';
  const { data: wRes } = await supabase.from('warehouses').select('id').eq('business_id', demoBusinessId).limit(1);
  if (wRes && wRes.length > 0) {
    defaultWarehouseId = wRes[0].id;
  } else {
    const { data: w } = await supabase.from('warehouses').insert({
      business_id: demoBusinessId,
      name: 'Gudang Utama (Demo)',
      is_default: true
    }).select().single();
    if (w) defaultWarehouseId = w.id;
  }

  // Inject Kategori
  console.log('Menginjeksi kategori...');
  let { data: cats } = await supabase.from('categories').select('*').eq('business_id', demoBusinessId);
  if (!cats || cats.length === 0) {
    await supabase.from('categories').insert([
      { business_id: demoBusinessId, name: 'Minuman Kopi', description: 'Kopi susu, espresso, dll' },
      { business_id: demoBusinessId, name: 'Makanan Ringan', description: 'Camilan dan gorengan' }
    ]);
    const { data: c } = await supabase.from('categories').select('*').eq('business_id', demoBusinessId);
    if (c) cats = c;
  }
  const cat1 = (cats || []).find(c => c.name === 'Minuman Kopi') || (cats || [])[0];
  const cat2 = (cats || []).find(c => c.name === 'Makanan Ringan') || (cats || [])[0];

  if (cat1 && cat2) {
    // Inject Produk
    console.log('Menginjeksi produk...');
    const { data: insertedProducts } = await supabase.from('products').insert([
      {
        business_id: demoBusinessId,
        category_id: cat1.id,
        sku: `KP-${Date.now().toString().slice(-4)}`,
        name: 'Kopi Susu Gula Aren',
        description: 'Kopi susu manis dengan gula aren asli',
        sell_price: 18000,
        cost_price: 10000,
        min_stock: 10,
        unit: 'Cup',
        barcode: `899${Date.now().toString().slice(-8)}`
      },
      {
        business_id: demoBusinessId,
        category_id: cat1.id,
        sku: `KP-${Date.now().toString().slice(-4)}A`,
        name: 'Americano Dingin',
        description: 'Espresso dengan es batu',
        sell_price: 15000,
        cost_price: 8000,
        min_stock: 20,
        unit: 'Cup',
        barcode: `899${(Date.now() + 1).toString().slice(-8)}`
      },
      {
        business_id: demoBusinessId,
        category_id: cat2.id,
        sku: `MK-${Date.now().toString().slice(-4)}`,
        name: 'Kentang Goreng',
        description: 'Kentang goreng renyah',
        sell_price: 12000,
        cost_price: 6000,
        min_stock: 5,
        unit: 'Porsi',
        barcode: `899${(Date.now() + 2).toString().slice(-8)}`
      }
    ]).select('id');

    const stockByProduct = [50, 100, 30];
    if (insertedProducts && insertedProducts.length > 0 && defaultWarehouseId) {
      await supabase.from('product_stock').insert(
        insertedProducts.map((p, i) => ({
          product_id: p.id,
          warehouse_id: defaultWarehouseId,
          quantity: stockByProduct[i] ?? 20
        }))
      );
    }
  }

  // Inject Customers
  console.log('Menginjeksi pelanggan...');
  await supabase.from('customers').insert([
    { business_id: demoBusinessId, name: 'Budi Santoso', phone: `0812${Date.now().toString().slice(-8)}`, loyalty_points: 1500, created_by: demoUserId },
    { business_id: demoBusinessId, name: 'Siti Aminah', phone: `0898${Date.now().toString().slice(-8)}`, loyalty_points: 500, created_by: demoUserId },
    { business_id: demoBusinessId, name: 'Andi Pratama', phone: `0856${Date.now().toString().slice(-8)}`, loyalty_points: 0, created_by: demoUserId }
  ]);

  // Inject Suppliers
  console.log('Menginjeksi supplier...');
  await supabase.from('suppliers').insert([
    { business_id: demoBusinessId, name: 'Distributor Kopi Nusantara', phone: `02199${Date.now().toString().slice(-6)}`, address: 'Jl. Sudirman No. 10' },
    { business_id: demoBusinessId, name: 'Toko Kemasan Plastik', phone: `02155${Date.now().toString().slice(-6)}`, address: 'Pasar Baru' }
  ]);

  console.log('✅ Demo data berhasil diinjeksi sepenuhnya!');
}

fixDemoAccount();
