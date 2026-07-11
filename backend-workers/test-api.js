const https = require('https');

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function test() {
  const loginRes = await request('https://api.beres.lambada.my.id/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ phone: '08120028271', password: 'password123' }));
  
  const token = JSON.parse(loginRes.data).data.token;
  
  const purchasesRes = await request('https://api.beres.lambada.my.id/purchases', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('GET /purchases:', purchasesRes.status, purchasesRes.data);

  const purchaseOrdersRes = await request('https://api.beres.lambada.my.id/purchase-orders', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('GET /purchase-orders:', purchaseOrdersRes.status, purchaseOrdersRes.data);
  
  const syncRes = await request('https://api.beres.lambada.my.id/sync/pull', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('GET /sync/pull:', syncRes.status, syncRes.data);
}

test();
