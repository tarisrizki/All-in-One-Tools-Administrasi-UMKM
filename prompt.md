# MASTER BUILD PROMPT — All-in-One Tools Administrasi UMKM

> Copy seluruh isi file ini sebagai satu prompt ke Antigravity. Pakai **Planning mode**,
> bukan Fast — scope-nya besar, kamu perlu bisa review rencana per batch sebelum
> Gemini menyentuh puluhan file sekaligus.

---

## Konteks (jangan dikerjakan ulang — ini sudah ada & jalan)

Auth + multi-tenant, Produk/Kategori/Stok, Gudang, Supplier, Purchase Order,
POS/Sales (pembayaran tunai saja), Cashbook, Hutang-Piutang (dengan reminder
WhatsApp yang **masih mock**), Customers/CRM dasar, Employees + Roles (cuma
2 role: admin/cashier), Reports (laba-rugi, arus kas, dashboard — tanpa
ekspor), Calculator (harga/margin/BEP/ROI), Settings.

Sebelum mulai: commit `DESIGN.md`, PRD, Technical Specification, User Flow &
Wireframe, dan Project Timeline (dokumen-dokumen yang sudah dibuat sebelumnya)
ke root repo kalau belum ada, supaya jadi referensi persisten yang bisa
di-load ulang tiap sesi — jangan cuma mengandalkan riwayat chat.

Kerjakan **satu batch penuh sampai `npm run build` + `svelte-check` bersih**
sebelum lanjut ke batch berikutnya. Jangan loncat batch.

---

## BATCH A — Sync Offline-First (paling prioritas, fondasi arsitektur)

Ini bukan fitur tambahan — ini alasan utama produk ini berbentuk PWA.
Tanpa ini, POS berhenti total saat internet mati.

1. **Client-side**: simpan produk/stok/kategori ke local storage (IndexedDB
   via Dexie.js — sesuai §3.3 Tech Spec) saat online, jadi tetap terbaca
   read-only saat offline.
2. Transaksi POS yang dibuat saat offline: simpan ke local DB dengan
   `client_transaction_id` (UUID) unik, tandai `pending_sync`, cetak
   struk tetap jalan (jangan block UI menunggu server).
3. **Backend**: endpoint `POST /v1/sync/push` (terima antrean perubahan,
   idempotent berdasarkan `client_transaction_id` — TOLAK kalau ID sudah
   pernah diproses) dan `GET /v1/sync/pull?since=` (kirim balik perubahan
   produk/stok terbaru dari server).
4. Badge status koneksi (online/offline/syncing) di topbar — persisten,
   BUKAN modal. Konsisten dengan pola yang sudah ada di halaman lain.
5. Uji manual wajib: matikan network di DevTools, buat transaksi di
   halaman Kasir, nyalakan lagi network, pastikan transaksi muncul di
   database server tanpa duplikat.

---

## BATCH B — Alur Uang Lengkap (pembayaran & dokumen)

1. **QRIS & metode pembayaran**: POS saat ini cuma terima input tunai.
   Tambah pilihan metode (QRIS/transfer/kredit-tempo), dan dukung split
   payment (sebagian tunai + sebagian metode lain dalam satu transaksi).
   Untuk QRIS sungguhan butuh akun payment gateway asli — kalau belum
   ada, buat dulu sebagai integrasi mock yang jelas ditandai MOCK di
   kode (sama seperti WhatsApp reminder sekarang), supaya UI dan alurnya
   sudah benar dan tinggal pasang kredensial asli nanti.
2. **Generate dokumen PDF sungguhan** (bukan cuma nomor invoice string
   yang sudah ada): Invoice, Kwitansi, Nota, dan Surat Jalan. Pakai
   library PDF di backend, simpan hasilnya ke object storage, endpoint
   `GET /v1/sales/{id}/invoice` dst mengembalikan URL PDF-nya.
3. **Generator barcode & QR Code sungguhan** — saat ini `barcode` cuma
   field teks. Tambah endpoint/komponen yang benar-benar me-render
   barcode (Code128) dan QR Code dari field itu, bisa di-print.
4. **Stempel & tanda tangan digital**: fitur upload gambar stempel/TTD
   pemilik toko, disisipkan otomatis ke dokumen PDF yang digenerate.

---

## BATCH C — Laporan & Portabilitas Data

1. Tombol ekspor **PDF dan Excel** di halaman Reports — laba rugi, arus
   kas, penjualan, inventori. Excel pakai library seperti ExcelJS.
2. **Backup data**: endpoint manual trigger backup (dump database ke
   object storage) + job terjadwal (pakai BullMQ yang sudah ada) untuk
   backup otomatis harian. Sediakan juga cara restore-nya, jangan cuma
   backup satu arah.

---

## BATCH D — Hak Akses Granular

Roles sekarang cuma 2 nama tetap (admin/cashier) tanpa permission
matrix. Bangun sistem permission per-modul (mis. `products:write`,
`reports:read`, `debts:manage`) yang disimpan di kolom `permissions`
JSONB pada tabel `roles` (kolomnya sudah ada di skema, belum dipakai).
Enforce di level API (middleware cek permission), bukan cuma sembunyikan
tombol di UI.

---

## BATCH E — Integrasi Eksternal

1. **WhatsApp**: ganti implementasi mock di modul debts jadi integrasi
   asli (WhatsApp Business API), dipakai juga untuk kirim invoice/nota
   ke pelanggan.
2. **Email**: kirim invoice/laporan via email (pakai service seperti
   Resend/Nodemailer+SMTP).
3. **Payment gateway asli**: pilih satu provider (mis. Midtrans/Xendit)
   untuk gantikan mock QRIS di Batch B.
4. **Marketplace**: mulai dari SATU platform dulu (sesuai §7 Tech Spec —
   jangan langsung multi-platform), tarik order masuk via API mereka.
5. **Printer thermal/barcode**: cetak struk & label lewat WebUSB/
   WebBluetooth (ESC/POS), bukan cuma print dialog browser biasa.

---

## BATCH F — Membership & Loyalty

Kolom `loyalty_points` di tabel customers sudah ada tapi tidak dipakai.
Bangun logikanya: aturan dapat poin per transaksi, halaman redeem poin
jadi diskon, dan tier membership sederhana (mis. Reguler/Silver/Gold
berdasarkan akumulasi belanja).

---

## BATCH G — Fitur AI

1. **Prediksi stok habis** + rekomendasi restok — berdasarkan histori
   penjualan & kecepatan jual per produk.
2. **Prediksi penjualan** — proyeksi sederhana berdasarkan tren 7/30
   hari terakhir yang datanya sudah ada di Reports.
3. **Ringkasan performa bisnis otomatis** — rangkuman mingguan dalam
   bahasa natural (mis. "Penjualan naik 12% dari minggu lalu, produk
   terlaris X").
4. **Asisten administrasi** — chat sederhana yang bisa jawab pertanyaan
   dasar tentang data toko sendiri (stok, omzet, piutang jatuh tempo).

Semua fitur AI ini boleh mulai dari model sederhana/rule-based dulu
(sesuai §7 Tech Spec — "mulai dari versi sederhana, iterasi berdasarkan
data pengguna riil"), tidak perlu langsung machine learning kompleks.

---

## Aturan Main

- Setiap batch selesai → jalankan `npm run build` dan `npx svelte-check`,
  pastikan bersih, baru lanjut batch berikutnya.
- Jangan ubah struktur token desain (`layout.css`/`shadcn.css`) kecuali
  memang perlu token baru — kalau perlu, tambah di `layout.css`, jangan
  duplikat di tempat lain.
- Semua teks UI tetap Bahasa Indonesia.
- Setiap fitur baru yang builds on existing table (mis. loyalty_points,
  permissions JSONB) — pakai kolom yang sudah ada, jangan bikin skema
  paralel yang tumpang tindih.
- Kalau satu batch ternyata butuh kredensial pihak ketiga yang belum
  ada (API key payment gateway, WhatsApp Business, dst) — bangun dulu
  strukturnya dengan mock yang jelas ditandai, jangan berhenti total
  menunggu kredensial.

**Deliverable per batch**: artifact walkthrough singkat (file yang
diubah + alasan) supaya saya bisa review sebelum lanjut ke batch
berikutnya.