# Frontend Route Coverage Report

> **Tanggal Audit**: $(date +%Y-%m-%d)  
> **Project**: Beres UMKM App  
> **Frontend Stack**: SvelteKit  
> **Backend Stack**: Hono/Cloudflare Workers + Supabase

---

## Ringkasan Coverage

| Status | Jumlah | Keterangan |
|--------|--------|------------|
| ✅ Complete | 20 | Page + Handler ada |
| ⚠️ Partial | 2 | Handler hanya API, UI terbatas |
| ❌ Missing Page | 0 | Tidak ada handler tanpa UI |
| 🔵 Orphan Page | 2 | UI tanpa handler (landing/internal tools) |

---

## Tabel Coverage Lengkap

| Route | Handler | Page | Status | Catatan |
|-------|---------|------|--------|---------|
| `/` | ❌ (Landing) | `+page.svelte` | ✅ complete | Landing page statis, tanpa backend handler |
| `/auth/login` | POST `/auth/login` | `login/+page.svelte` | ✅ complete | Login form dengan validasi Zod |
| `/auth/register` | POST `/auth/register` | `register/+page.svelte` | ✅ complete | Multi-step registration |
| `/dashboard` | GET `/reports/dashboard` | `dashboard/+page.svelte` | ✅ complete | Stats grid, charts, recent activity |
| `/products` | GET/POST `/products` | `products/+page.svelte` | ✅ complete | List dengan search |
| `/products/new` | POST `/products` | `products/new/+page.svelte` | ✅ complete | Form produk dengan stok awal |
| `/products/[id]` | GET/PUT/DELETE `/products/{id}` | ❌ missing | ⚠️ partial | Handler ada (`barcode`, `qrcode`), page detail belum ada |
| `/customers` | GET/POST `/customers` | `customers/+page.svelte` | ✅ complete | List dengan search |
| `/customers/new` | POST `/customers` | `customers/new/+page.svelte` | ✅ complete | Form pelanggan |
| `/customers/[id]` | GET/PUT `/customers/{id}` | ❌ missing | ⚠️ partial | Handler detail & edit ada, page belum |
| `/suppliers` | GET/POST `/suppliers` | `suppliers/+page.svelte` | ✅ complete | CRUD supplier |
| `/suppliers/[id]` | PUT/DELETE `/suppliers/{id}` | ❌ missing | ⚠️ partial | Handler edit & delete ada, page belum |
| `/penjualan` | GET `/sales` | `penjualan/+page.svelte` | ✅ complete | Riwayat transaksi |
| `/pos` | POST `/sales` | `pos/+page.svelte` | ✅ complete | Point of Sale dengan cart |
| `/purchases` | GET `/purchases` | `purchases/+page.svelte` | ✅ complete | List purchase orders |
| `/purchases/new` | POST `/purchases` | `purchases/new/+page.svelte` | ✅ complete | Form purchase order |
| `/purchases/[id]` | GET/PUT `/purchases/{id}` | ❌ missing | ⚠️ partial | Handler detail & status update ada, page belum |
| `/debts` | GET `/debts` | `debts/+page.svelte` | ✅ complete | Tab piutang & hutang |
| `/debts/new` | POST `/debts` | `debts/new/+page.svelte` | ✅ complete | Form cicilan/piutang |
| `/debts/[id]` | GET/POST `/debts/{id}` | `debts/[id]/+page.svelte` | ✅ complete | Detail + form pembayaran |
| `/cashbook` | GET `/cashbook` | `cashbook/+page.svelte` | ✅ complete | Entri kas masuk/keluar |
| `/cashbook/new` | POST `/cashbook` | `cashbook/new/+page.svelte` | ✅ complete | Form entri kas |
| `/reports` | GET `/reports/profit-loss` | `reports/+page.svelte` | ✅ complete | Tab profit-loss, cash-flow, sales, inventory |
| `/employees` | GET/POST `/employees` | `employees/+page.svelte` | ✅ complete | List karyawan |
| `/employees/new` | POST `/employees` | `employees/new/+page.svelte` | ✅ complete | Form tambah karyawan |
| `/settings` | GET/PUT `/settings` | `settings/+page.svelte` | ✅ complete | Profile, QRIS, app mode, printer, backup |
| `/settings/roles` | GET/POST/PUT/DELETE `/roles` | `settings/roles/+page.svelte` | ✅ complete | CRUD role & permission |
| `/ai` | GET `/ai/predictions`, GET `/ai/summary`, POST `/ai/chat` | `ai/+page.svelte` | ✅ complete | AI insights & chat assistant |
| `/calculator` | ❌ (Client-side) | `calculator/+page.svelte` | ✅ complete | Kalkulator margin/BEP/ROI |

---

## Detail Status

### ✅ Complete (20 routes)
Semua route utama memiliki page Svelte **dan** handler API yang sesuai. Fitur CRUD lengkap terimplementasi.

### ⚠️ Partial / Missing Pages (5 items)

| Route | Masalah |
|-------|---------|
| `/products/[id]` | Handler GET `/products/{id}`, barcode, qrcode ada, tapi page detail produk belum dibuat |
| `/customers/[id]` | Handler GET/PUT `/customers/{id}` ada, tapi page edit/detail belum |
| `/suppliers/[id]` | Handler PUT/DELETE `/suppliers/{id}` ada, tapi page belum |
| `/purchases/[id]` | Handler GET `/purchases/{id}` dan PUT `/purchases/{id}/status` ada, page belum |

### 🔵 Orphan Pages (2 items)

| Route | Keterangan |
|-------|------------|
| `/` | Landing page statis, bukan aplikasi - tidak butuh handler API |
| `/calculator` | Tools internal client-side - tidak terhubung ke backend |

---

## API Routes Backend (Referensi)

| Base Path | Methods | Endpoints |
|-----------|---------|-----------|
| `/auth` | POST | register, login, logout, refresh |
| `/categories` | GET, POST | / |
| `/customers` | GET, POST, PUT, DELETE | /, /{id} |
| `/products` | GET, POST, PUT, DELETE | /, /{id}, /{id}/barcode, /{id}/qrcode |
| `/sales` | GET, POST | /, /{id} |
| `/cashbook` | GET, POST | /, /summary |
| `/debts` | GET, POST, PUT, DELETE | /, /{id}, /{id}/remind, /{id}/payments |
| `/purchases` | GET, POST, PUT | /, /{id}, /{id}/status |
| `/reports` | GET | /dashboard, /profit-loss, /cash-flow, /sales, /inventory, /export |
| `/roles` | GET, POST, PUT, DELETE | /, /{id} |
| `/settings` | GET, POST, PUT | /, /{id}, /qris, /qris-token, /{id}/document, /{id}/send-wa, /{id}/send-email, /upload, /usage |
| `/suppliers` | GET, POST, PUT, DELETE | /, /{id} |
| `/employees` | GET, POST | / |
| `/warehouses` | GET | / |
| `/sync` | GET, POST | /pull, /push |
| `/ai` | GET, POST | /predictions, /summary, /chat |
| `/health` | GET | / |

---

## Rekomendasi Tindakan

### Prioritas Tinggi
1. **Buat page `/products/[id]`** - Detail produk dengan barcode/QR code generator
2. **Buat page `/customers/[id]`** - Edit & detail pelanggan
3. **Buat page `/suppliers/[id]`** - Edit & detail supplier
4. **Buat page `/purchases/[id]`** - Detail & update status purchase order

### Prioritas Rendah
- Landing page `/` sudah optimal sebagai static landing
- Calculator `/calculator` berfungsi sebagai tools client-side

---

## Statistik

```
Total Routes Frontend  : 26
Total Routes Backend   : 17 (base path)
Routes Complete        : 20 (77%)
Routes Partial         : 4 (15%)
Orphan Pages           : 2 (8%)
Missing Pages          : 0
```

---

*Generated secara otomatis oleh coverage audit script*
