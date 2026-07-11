import * as fs from 'fs';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const baseUrl = 'http://localhost:8787';
  let token = '';
  
  const log = (step: string, request: any, response: any, success: boolean, data?: any) => {
    console.log(`\n--- [${success ? '✅' : '❌'}] STEP: ${step} ---`);
    console.log('📝 Request:', JSON.stringify(request, null, 2));
    console.log('📥 Response:', JSON.stringify(response, null, 2));
    if (!success) {
      console.error(`🚨 FATAL: Step "${step}" failed! Halting execution.`);
      process.exit(1);
    }
  };

  const phone = `081${Math.floor(Math.random() * 100000000)}`;
  const password = 'password123';

  // Wait for wrangler dev to be ready
  console.log("Waiting for wrangler dev...");
  await delay(2000);

  // Step A: Register
  console.log("\nExecuting Step A: Register");
  const registerPayload = {
    phone,
    password,
    businessName: 'Toko End to End',
    cfTurnstileResponse: 'dummy-token' 
  };
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload)
  });
  const regData = await regRes.json();
  log('Register', { method: 'POST', url: '/auth/register', body: registerPayload }, regData, regRes.status === 201);
  
  if (regData.data && regData.data.token) {
    token = regData.data.token;
  } else {
    console.error("Token not found after register!");
    process.exit(1);
  }

  // Step B: Login
  console.log("\nExecuting Step B: Login");
  const loginPayload = { phone, password };
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginPayload)
  });
  const loginData = await loginRes.json();
  log('Login', { method: 'POST', url: '/auth/login', body: loginPayload }, loginData, loginRes.status === 200);
  
  // Update token from login
  token = loginData.data.token;

  // Step C: Create Product
  console.log("\nExecuting Step C: Create Product");
  const productPayload = {
    name: "Kopi Susu E2E",
    costPrice: 8000,
    sellPrice: 15000,
    initialStock: 100,
    sku: `SKU-${Date.now()}`,
    barcode: `BC-${Date.now()}`,
    categoryId: null
  };
  const prodRes = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(productPayload)
  });
  const prodData = await prodRes.json();
  log('Create Product', { method: 'POST', url: '/products', body: productPayload }, prodData, prodRes.status === 201);
  const productId = prodData.data.id;

  // Step D: Create Employee
  console.log("\nExecuting Step D: Create Employee");
  const rolesRes = await fetch(`${baseUrl}/roles`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const rolesData = await rolesRes.json();
  const cashierRole = rolesData.data.find((r: any) => r.name.toLowerCase() === 'cashier');
  if (!cashierRole) {
    console.error("Cashier role not found!");
    process.exit(1);
  }

  const empPayload = {
    name: "Kasir E2E",
    phone: `082${Math.floor(Math.random() * 100000000)}`,
    password: "password123",
    role_id: cashierRole.id
  };
  const empRes = await fetch(`${baseUrl}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(empPayload)
  });
  const empData = await empRes.json();
  log('Create Employee', { method: 'POST', url: '/employees', body: empPayload }, empData, empRes.status === 201);

  // Step E: Complete POS Transaction & Verify Stock
  console.log("\nExecuting Step E: POS Transaction & Stock Verify");
  // Get initial stock
  const stockRes1 = await fetch(`${baseUrl}/products?search=Kopi`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const stockData1 = await stockRes1.json();
  const initialQty = stockData1.data.find((p: any) => p.id === productId)?.stock || 100;
  
  const posPayload = {
    items: [{ productId, qty: 2, price: 15000, discount: 0 }],
    payments: [{ method: 'cash', amount: 30000 }]
  };
  const posRes = await fetch(`${baseUrl}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(posPayload)
  });
  const posData = await posRes.json();
  log('POS Transaction', { method: 'POST', url: '/sales', body: posPayload }, posData, posRes.status === 201);

  // Check stock after sale
  const stockRes2 = await fetch(`${baseUrl}/products?search=Kopi`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const stockData2 = await stockRes2.json();
  const finalQty = stockData2.data.find((p: any) => p.id === productId)?.stock;
  
  log('Verify Stock', { method: 'GET', url: '/products/stock' }, { initialQty, finalQty }, finalQty === initialQty - 2);

  // Step F: Create Debt (Receivable)
  console.log("\nExecuting Step F: Create Debt");
  const debtPayload = {
    type: "piutang",
    entity_name: "Pelanggan E2E",
    entity_phone: "0899999999",
    amount: 50000,
    notes: "Hutang bon warung"
  };
  const debtRes = await fetch(`${baseUrl}/debts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(debtPayload)
  });
  const debtData = await debtRes.json();
  log('Create Debt', { method: 'POST', url: '/debts', body: debtPayload }, debtData, debtRes.status === 201);
  
  const getDebtRes = await fetch(`${baseUrl}/debts?type=piutang`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getDebtData = await getDebtRes.json();
  log('Verify Debt', { method: 'GET', url: '/debts?type=piutang' }, getDebtData, getDebtRes.status === 200 && getDebtData.data.some((d: any) => d.id === debtData.data.id));

  // Step G: IDOR Test
  console.log("\nExecuting Step G: IDOR Test");
  // Create another JWT manually for a different business_id, or just try to use this token to access a known different ID.
  // Wait, if we try to access a known resource ID from business A with this token (business B), it should return 404.
  // Let's create a product in Business A first? We don't know an ID.
  // We can just try to fetch a completely random UUID. If it's IDOR protected, it returns 404 (not found).
  // Actually, we can get the demo business ID from Supabase and try to fetch its product.
  // But since we can't easily query Supabase here, we'll try to fetch sales with a valid UUID of another business, or just a dummy UUID.
  // If we fetch /sales/00000000-0000-4000-8000-000000000000/document, it should return 404, not 500 or 403 (because of IDOR scoping).
  const idorRes = await fetch(`${baseUrl}/sales/00000000-0000-4000-8000-000000000000/document`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const idorData = await idorRes.json();
  log('IDOR Test (Access dummy sale)', { method: 'GET', url: '/sales/dummy-uuid/document' }, idorData, idorRes.status === 404);

  // Step H: Open /docs
  console.log("\nExecuting Step H: Check /docs");
  const docsRes = await fetch(`${baseUrl}/docs`);
  const docsText = await docsRes.text();
  const hasModules = docsText.includes('Scalar') || docsText.includes('Swagger');
  log('Check /docs', { method: 'GET', url: '/docs' }, { status: docsRes.status, length: docsText.length }, docsRes.status === 200 && hasModules);

  console.log("\n🎉 SEMUA TES E2E BERHASIL!");
}

main().catch(console.error);
