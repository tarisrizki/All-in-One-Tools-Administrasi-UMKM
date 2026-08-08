# Changelog

Semua perubahan signifikan didokumentasikan di sini. Format: versi, tanggal, kategori, deskripsi.

---

## [1.1.0] - 2026-08-09

### feat(roadmap): feature set lengkap Qasir — POS, inventori, laporan, outlet, pegawai, strategi bisnis

### Feat
- **Roadmap** - Kasir POS: pajak per produk, tipe order + biaya layanan, status order, cetak tiket pesanan, atur tampilan struk, pengaturan meja, uang muka pre-order, label pembayaran per jenis transaksi, nomor antrian pelanggan
- **Roadmap** - Inventori: export & ubah produk sekaligus (bulk), kelola bahan baku, harga grosir, pengingat kedaluarsa produk
- **Roadmap** - Laporan perputaran stok + periode akses laporan
- **Roadmap** - Multi-outlet: outlet utama + outlet cabang
- **Roadmap** - Pegawai: absensi, tugaskan pegawai ke transaksi tertentu
- **Roadmap** - Strategi bisnis: kelola diskon, poin loyalitas pelanggan

### Docs
- Rombak README, MARKETING, FAQ, RELEASE_NOTES, CHANGELOG, ARCHITECTURE sesuai set fitur Qasir
- RELEASE_NOTES dirombak total (stack lama Next.js/React tidak sesuai implementasi Svelte 5/Hono)

---

## [1.0.0] - 2026-08-08

### refactor: replace bcryptjs+pdf-lib with Web Crypto, fix sync RPC, purchases IDOR, cashbook pagination, supabase schema

### Security
- **[`6925acb`](https://github.com/tarisrizki/umkm-app/commit/6925acb)** - `2026-08-08` - Migrasi `bcryptjs` ke WebCrypto API dengan PBKDF2-SHA256 untuk hashing password; hapus dependensi `bcryptjs`
- **[`dfcb832`](https://github.com/tarisrizki/umkm-app/commit/dfcb832)** - `2026-08-08` - Refresh token pair dengan expiry 8 jam (access) + 30 hari (refresh), validasi scope

### Deps
- **[`6925acb`](https://github.com/tarisrizki/umkm-app/commit/6925acb)** - `2026-08-08` - Hapus `pdf-lib`; ganti dengan client-side printing via browser print dialog untuk struk

### Feat
- **[`6925acb`](https://github.com/tarisrizki/umkm-app/commit/6925acb)** - `2026-08-08` - RPC `process_sale` atomik dengan idempotency via `client_transaction_id` + row locking untuk prevent oversell
- **[`6925acb`](https://github.com/tarisrizki/umkm-app/commit/6925acb)** - `2026-08-08` - RPC `receive_purchase_order` atomik untuk terima barang PO + update stock; race condition fix dengan `FOR UPDATE`
- **[`6925acb`](https://github.com/tarisrizki/umkm-app/commit/6925acb)** - `2026-08-08` - Cashbook dengan pagination + summary total per tipe (in/out)
- **[`6925acb`](https://github.com/tarisrizki/umkm-app/commit/6925acb)** - `2026-08-08` - Full Supabase schema dengan RLS policies + unique constraints; service-role bypass untuk backend

### Fix
- **[`dfcb832`](https://github.com/tarisrizki/umkm-app/commit/dfcb832)** - `2026-08-08` - Purchases GET endpoint: perbaiki IDOR vulnerability dengan scoped query ke `business_id`
- **[`6925acb`](https://github.com/tarisrizki/umkm-app/commit/6925acb)** - `2026-08-08` - Employee quota scoped ke `business_id` user
- **[`dfcb832`](https://github.com/tarisrizki/umkm-app/commit/dfcb832)** - `2026-08-08` - Body size limit untuk sync push: maksimal 100 transaksi per request
- **[`dfcb832`](https://github.com/tarisrizki/umkm-app/commit/dfcb832)** - `2026-08-08` - Date validation `since` parameter untuk sync endpoint; reject invalid date format

---

## [0.9.0] - 2026-07-11

### refactor(docs): migrate all modules to OpenAPIHono

### Refactor
- **[`8b55816`](https://github.com/tarisrizki/umkm-app/commit/8b55816)** - `2026-07-11` - Migrasi module AI ke OpenAPIHono
- **[`6994d85`](https://github.com/tarisrizki/umkm-app/commit/6994d85)** - `2026-07-11` - Migrasi module sync ke OpenAPIHono
- **[`07512e7`](https://github.com/tarisrizki/umkm-app/commit/07512e7)** - `2026-07-11` - Migrasi module roles ke OpenAPIHono
- **[`96edd99`](https://github.com/tarisrizki/umkm-app/commit/96edd99)** - `2026-07-11` - Migrasi module reports ke OpenAPIHono
- **[`4203081`](https://github.com/tarisrizki/umkm-app/commit/4203081)** - `2026-07-11` - Migrasi module settings ke OpenAPIHono
- **[`286c04f`](https://github.com/tarisrizki/umkm-app/commit/286c04f)** - `2026-07-11` - Migrasi module auth ke OpenAPIHono
- **[`98596eb`](https://github.com/tarisrizki/umkm-app/commit/98596eb)** - `2026-07-11` - Migrasi module cashbook ke OpenAPIHono
- **[`ab724c8`](https://github.com/tarisrizki/umkm-app/commit/ab724c8)** - `2026-07-11` - Migrasi module debts ke OpenAPIHono
- **[`7fef2ac`](https://github.com/tarisrizki/umkm-app/commit/7fef2ac)** - `2026-07-11` - Migrasi module purchases ke OpenAPIHono
- **[`2fcf17d`](https://github.com/tarisrizki/umkm-app/commit/2fcf17d)** - `2026-07-11` - Migrasi module sales ke OpenAPIHono
- **[`638fcd9`](https://github.com/tarisrizki/umkm-app/commit/638fcd9)** - `2026-07-11` - Migrasi module customers ke OpenAPIHono
- **[`35e517c`](https://github.com/tarisrizki/umkm-app/commit/35e517c)** - `2026-07-11` - Migrasi module employees ke OpenAPIHono
- **[`24d3c70`](https://github.com/tarisrizki/umkm-app/commit/24d3c70)** - `2026-07-11` - Migrasi module suppliers ke OpenAPIHono
- **[`ff8fa26`](https://github.com/tarisrizki/umkm-app/commit/ff8fa26)** - `2026-07-11` - Migrasi module warehouses ke OpenAPIHono
- **[`7be60bb`](https://github.com/tarisrizki/umkm-app/commit/7be60bb)** - `2026-07-11` - Migrasi module categories ke OpenAPIHono
- **[`b4b228f`](https://github.com/tarisrizki/umkm-app/commit/b4b228f)** - `2026-07-11` - Migrasi module health ke OpenAPIHono

### Feat
- **[`16813b1`](https://github.com/tarisrizki/umkm-app/commit/16813b1)** - `2026-07-11` - Implementasi Phase M: Gemini AI Assistant dengan rate limiting
- **[`6bd7f2f`](https://github.com/tarisrizki/umkm-app/commit/6bd7f2f)** - `2026-07-11` - Implementasi Phase L: Upload QRIS statis dan POS checkout
- **[`3fdd2e9`](https://github.com/tarisrizki/umkm-app/commit/3fdd2e9)** - `2026-07-11` - Implementasi Phase K: Toggle mode Sederhana vs Lengkap
- **[`92cc393`](https://github.com/tarisrizki/umkm-app/commit/92cc393)** - `2026-07-11` - Finalize security hardening Phases G-J

### Fix
- **[`2abc809`](https://github.com/tarisrizki/umkm-app/commit/2abc809)** - `2026-07-11` - Perbaiki dimensi iframe untuk mobile print spooler
- **[`63db933`](https://github.com/tarisrizki/umkm-app/commit/63db933)** - `2026-07-11` - Perbaiki fitur cetak struk dengan nama dinamis & fallback print browser
- **[`ca9ddf1`](https://github.com/tarisrizki/umkm-app/commit/ca9ddf1)** - `2026-07-11` - Fix ActionTile: pindahkan `@const Icon` ke script untuk kompatibilitas Svelte 5
- **[`01341fb`](https://github.com/tarisrizki/umkm-app/commit/01341fb)** - `2026-07-11` - Rename field cashbook 'note' ke 'description' agar match dengan backend
- **[`520ff0e`](https://github.com/tarisrizki/umkm-app/commit/520ff0e)** - `2026-07-11` - Fix sync store handling response format dan URL route purchases
- **[`31c2d68`](https://github.com/tarisrizki/umkm-app/commit/31c2d68)** - `2026-07-11` - Fix IDOR tests dan fail-open logic di docsAuth middleware

---

## [0.8.0] - 2026-07-10

### feat(security): implement post-cutover hardening phases A-E

### Feat
- **[`e95860f`](https://github.com/tarisrizki/umkm-app/commit/e95860f)** - `2026-07-10` - Implementasi security hardening Phases A-E post-cutover
- **[`faf6d34`](https://github.com/tarisrizki/umkm-app/commit/faf6d34)** - `2026-07-10` - Implementasi Phase F: Turnstile anti-bot check + strict phone validation saat register
- **[`31cd42a`](https://github.com/tarisrizki/umkm-app/commit/31cd42a)** - `2026-07-10` - Integrasi Phase F Turnstile widget di frontend

### Fix
- **[`a7c62f1`](https://github.com/tarisrizki/umkm-app/commit/a7c62f1)** - `2026-07-10` - Koreksi nama tabel backup: `employees` ke `users`
- **[`7540966`](https://github.com/tarisrizki/umkm-app/commit/7540966)** - `2026-07-10` - Koreksi nama tabel di RLS script: `cashbook` ke `cashbook_entries`
- **[`3a1b410`](https://github.com/tarisrizki/umkm-app/commit/3a1b410)** - `2026-07-10` - Expand scheduled worker backup ke semua tabel core
- **[`7b51375`](https://github.com/tarisrizki/umkm-app/commit/7b51375)** - `2026-07-10` - Koreksi nama tabel purchases di RLS script

### Security
- **[`d0d6dff`](https://github.com/tarisrizki/umkm-app/commit/d0d6dff)** - `2026-07-10` - Hapus public GitHub action backup workflow
- **[`aa65cc6`](https://github.com/tarisrizki/umkm-app/commit/aa65cc6)** - `2026-07-10` - Address post-commit security feedback

### Chore
- **[`f400684`](https://github.com/tarisrizki/umkm-app/commit/f400684)** - `2026-07-10` - Hapus unwanted deploy.yml workflow
- **[`45f0b26`](https://github.com/tarisrizki/umkm-app/commit/45f0b26)** - `2026-07-10` - Hapus prefix `/v1` dari API URL
- **[`4f3609f`](https://github.com/tarisrizki/umkm-app/commit/4f3609f)** - `2026-07-10` - Ubah dynamic env ke static env untuk API URL dan custom domain routing

---

## [0.7.0] - 2026-07-10 (Initial Release Candidate)

### Initial implementation

### Feat
- **[Initial]** - Module authentication (register, login, logout)
- **[Initial]** - Module products dengan CRUD dan barcode
- **[Initial]** - Module customers dengan loyalty points
- **[Initial]** - Module sales dengan invoice generation
- **[Initial]** - Module purchases dan purchase orders
- **[Initial]** - Module cashbook untuk pencatatan kas masuk/keluar
- **[Initial]** - Module debts untuk piutang dan hutang
- **[Initial]** - Module employees dengan role-based access
- **[Initial]** - Module suppliers
- **[Initial]** - Module categories
- **[Initial]** - Module warehouses dengan multi-gudang
- **[Initial]** - Module reports
- **[Initial]** - Module sync untuk offline-first functionality
- **[Initial]** - Module AI Assistant (Gemini integration)
- **[Initial]** - Module settings

### Infrastructure
- **[Initial]** - Cloudflare Workers deployment
- **[Initial]** - Supabase backend dengan PostgreSQL
- **[Initial]** - Docker Compose setup untuk development
- **[Initial]** - SvelteKit frontend
