const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backup() {
  const tables = [
    'businesses',
    'users',
    'roles',
    'categories',
    'products',
    'product_stock',
    'customers',
    'suppliers',
    'warehouses',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
    'cashbook',
    'debts'
  ];

  const backupData = {};
  console.log("Starting backup process...");
  
  await Promise.all(tables.map(async (table) => {
    console.log(`Fetching table: ${table}...`);
    // Need to paginate if data is huge, but for simple cron backup we use select('*')
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      backupData[table] = { error: error.message };
    } else {
      backupData[table] = data;
      console.log(`Successfully fetched ${data.length} rows from ${table}`);
    }
  }));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = path.join(backupDir, `db-backup-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
  console.log(`\nBackup successfully saved to ${filename}`);
}

backup().catch(console.error);
