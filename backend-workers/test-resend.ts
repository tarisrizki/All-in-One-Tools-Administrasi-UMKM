

async function testResend() {
  const EMAIL_API_KEY = "re_51G527rt_C1wZgHufuWymnaAVu6NyMJp3";
  console.log("Mengirim email percobaan via Resend...");

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Invoice <onboarding@resend.dev>', 
      to: 'delivered@resend.dev', // Default test email provided by Resend
      subject: 'Test Invoice Pembelian - UMKM (Resend)',
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Ini adalah email percobaan integrasi (Fase I).</h2>
        <p>Resend API Key Anda bekerja dengan sukses!</p>
        <p>Nomor Invoice: INV/2026/07/0001</p>
      </div>`
    })
  });

  const result = await response.json();
  if (response.ok) {
    console.log("✅ BERHASIL: Email berhasil dikirim via Resend API.");
    console.log("ID Pesan:", result.id);
  } else {
    console.error("❌ GAGAL mengirim email:", result);
  }
}

testResend();
