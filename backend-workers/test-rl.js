const url = 'https://api.beres.lambada.my.id/auth/login';
const data = { phone: '081234567890', password: 'wrongpassword' };

async function test() {
  for (let i = 1; i <= 6; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const text = await res.text();
    console.log(`Percobaan ${i}: Status ${res.status}`);
    console.log(text);
  }
}

test();
