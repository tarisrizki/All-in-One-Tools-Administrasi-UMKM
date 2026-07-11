import * as fs from 'fs';
import * as path from 'path';

const salesTsPath = path.resolve(__dirname, '../src/modules/sales.ts');
let content = fs.readFileSync(salesTsPath, 'utf8');

// 1. listRoute
content = content.replace(
  `.select('*, customers(name)', { count: 'exact' })`,
  `.select('*', { count: 'exact' })`
);

content = content.replace(
  `const formattedRows = (rows || []).map((r: any) => ({`,
  `// Fetch customers manually
    let custMap: Record<string, string> = {};
    const customerIds = (rows || []).map((r: any) => r.customer_id).filter(Boolean);
    if (customerIds.length > 0) {
      const { data: custRows } = await supabase.from('customers').select('id, name').in('id', customerIds);
      for (const c of custRows || []) {
        custMap[c.id] = c.name;
      }
    }

    const formattedRows = (rows || []).map((r: any) => ({`
);

content = content.replace(
  `customer_name: r.customers?.name || null,`,
  `customer_name: r.customer_id ? (custMap[r.customer_id] || 'Pelanggan Umum') : null,`
);

// 2. documentRoute
content = content.replace(
  `.select('*, customers(name, phone)')`,
  `.select('*')`
);

content = content.replace(
  `const businessName = biz?.name || "Toko Anda";`,
  `const businessName = biz?.name || "Toko Anda";

    let cust = { name: 'Pelanggan Umum', phone: '' };
    if (sale.customer_id) {
       const { data: cData } = await supabase.from('customers').select('name, phone').eq('id', sale.customer_id).single();
       if (cData) cust = cData;
    }
    sale.customers = cust;`
);

// 3. sendWaRoute
content = content.replace(
  `.select('invoice_number, grand_total, customers(name, phone)')`,
  `.select('invoice_number, grand_total, customer_id')`
);
content = content.replace(
  `const customer: any = sale.customers;`,
  `let customer: any = { name: 'Pelanggan Umum', phone: null };
    if (sale.customer_id) {
      const { data: cData } = await supabase.from('customers').select('name, phone').eq('id', sale.customer_id).single();
      if (cData) customer = cData;
    }`
);

// 4. sendEmailRoute
content = content.replace(
  `.select('invoice_number, grand_total, customers(name, email)')`,
  `.select('invoice_number, grand_total, customer_id')`
);
content = content.replace(
  `const customer: any = sale.customers;`,
  `let customer: any = { name: 'Pelanggan Umum', email: null };
    if (sale.customer_id) {
      const { data: cData } = await supabase.from('customers').select('name, email').eq('id', sale.customer_id).single();
      if (cData) customer = cData;
    }`
);

fs.writeFileSync(salesTsPath, content);
console.log('patched sales.ts');
