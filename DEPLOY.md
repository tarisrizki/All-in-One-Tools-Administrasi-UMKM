# Panduan Deploy Production

Dokumen ini berisi langkah-langkah deploy untuk environment production aplikasi All-in-One Tools Administrasi UMKM.

---

## 1. Prerequisites

### 1.1 Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) dan buat project baru.
2. Di **Project Settings > API**, catat:
   - **Project URL** — contoh: `https://xyz.supabase.co`
   - **service_role secret** — ini adalah `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Jalankan Schema & RLS

Buka **SQL Editor** di dashboard Supabase, lalu salin seluruh isi file:

👉 [`supabase-rls.sql`](./supabase-rls.sql)

Klik **Run** untuk mengeksekusi. File ini idempotent — aman dijalankan ulang.

Yang dibuat oleh script ini:
- Schema: `businesses`, `users`, `roles`, `customers`, `suppliers`, `warehouses`, `categories`, `products`, `product_stock`, `sales`, `sale_items`, `payments`, `purchase_orders`, `purchase_order_items`, `cashbook_entries`, `debts`, `debt_payments`
- Row Level Security (RLS) untuk setiap tabel
- Function & Trigger untuk otomatisasi (update `updated_at`, stock adjustment, debt tracking)
- RPC functions untuk operasi kompleks

### 1.3 Dapatkan Kredensial

| Variabel | Lokasi di Dashboard Supabase |
|---|---|
| `SUPABASE_URL` | Project Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API > service_role secret |
| `JWT_SECRET` | Project Settings > API > JWT Secret |

---

## 2. Cloudflare Workers — Setup Secrets

Secret tidak boleh disimpan di file. Gunakan `wrangler secret put` untuk setiap variabel.

```bash
cd backend-workers

# 1. URL Supabase (tidak termasuk trailing slash)
npx wrangler secret put SUPABASE_URL
# Masukkan: https://xyz.supabase.co

# 2. Service Role Key — KUNCI RAHASIA, jangan bagikan
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Masukkan: nilai service_role secret dari Supabase

# 3. JWT Secret — string acak yang panjang (min. 32 karakter)
npx wrangler secret put JWT_SECRET
# Masukkan: string acak, contoh: openssl rand -base64 32

# 4. API Key WhatsApp (Fonnte) — untuk Fase I
npx wrangler secret put WA_API_KEY
# Masukkan: kunci API Fonnte Anda

# 5. (Opsional) API Key Email (Resend)
npx wrangler secret put EMAIL_API_KEY
# Masukkan: kunci API Resend Anda
```

> **Peringatan:** `SUPABASE_SERVICE_ROLE_KEY` memberikan akses database tanpa RLS. Jangan pernah expose kunci ini ke frontend atau simpan di file `.env` yang di-commit.

### Verifikasi Secret

```bash
npx wrangler secret list
```

Pastikan semua secret terlihat (nilai tidak ditampilkan demi keamanan).

---

## 3. Environment Files

### 3.1 Perbandingan

| File | Lokasi | Isi | Di-commit? |
|---|---|---|---|
| `backend-workers/.env` | `backend-workers/` | Secret production (URL, keys) | ❌ Tidak |
| `backend-workers/.env.example` | `backend-workers/` | Template placeholder | ✅ Ya |
| `frontend/.env` | `frontend/` | `PUBLIC_API_URL` production | ❌ Tidak |
| `frontend/.env.example` | `frontend/` | Template placeholder | ✅ Ya |

### 3.2 `backend-workers/.env`

```env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # DARI WRANGLER SECRETS
JWT_SECRET=string-acak-panjang
ALLOWED_ORIGIN=https://namabisnis.com
WA_API_KEY=  # DARI WRANGLER SECRETS
EMAIL_API_KEY=  # DARI WRANGLER SECRETS
DOCS_USERNAME=admin
DOCS_PASSWORD=ganti-dengan-passwordkuat
```

### 3.3 `frontend/.env`

```env
PUBLIC_API_URL=https://api.namabisnis.com
```

> **Catatan:** Prefix `PUBLIC_` di Vite berarti variabel ini akan di-bundle ke kode klien. Hanya gunakan untuk URL publik. Jangan pernah meletakkan secret di `.env` frontend.

### 3.4 `ALLOWED_ORIGIN`

Pastikan domain frontend production tercantum di `ALLOWED_ORIGIN` agar CORS tidak diblokir. Contoh:

```env
# Satu origin
ALLOWED_ORIGIN=https://namabisnis.com

# Multiple origin (pisahkan dengan koma)
ALLOWED_ORIGIN=https://namabisnis.com,https://www.namabisnis.com
```

---

## 4. Deploy Commands

### 4.1 Deploy Backend (Cloudflare Workers)

```bash
cd backend-workers

# Pastikan dependencies terinstall
npm install

# Deploy ke production
npx wrangler deploy
```

Output berhasil пример:
```
✓  Successfully published your worker
  https://api.namabisnis.com
```

### 4.2 Deploy Frontend (Vite + Cloudflare Pages)

```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build
```

Output terdapat di `frontend/dist/`. Deploy folder ini ke Cloudflare Pages:

```bash
# Jika menggunakan wrangler (Cloudflare Pages)
npx wrangler pages deploy dist --project-name=umkm-frontend

# Atau via Cloudflare Dashboard:
# 1. Buka Cloudflare Dashboard > Pages > Create a Project
# 2. Pilih "Direct Upload"
# 3. Upload folder dist/
# 4. Set root directory: /
# 5. Build command: npm run build
# 6. Build output directory: dist
```

### 4.3 Urutan Deploy

```
1. Deploy backend-workers      → https://api.namabisnis.com
2. Update frontend/.env       → PUBLIC_API_URL=https://api.namabisnis.com
3. Build & deploy frontend     → https://namabisnis.com
```

---

## 5. Verifikasi

### 5.1 Health Check Backend

```bash
curl https://api.namabisnis.com/health
```

Respon berhasil:
```json
{"status":"ok","timestamp":"2025-01-01T00:00:00.000Z","version":"1.0.0"}
```

### 5.2 Verifikasi CORS

```bash
curl -X OPTIONS https://api.namabisnis.com/api/v1/businesses \
  -H "Origin: https://namabisnis.com" \
  -H "Access-Control-Request-Method: GET" \
  -I
```

Pastikan header respons mengandung:
```
Access-Control-Allow-Origin: https://namabisnis.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### 5.3 Verifikasi Dokumentasi API

```bash
# Ambil token dari Supabase (via browser DevTools setelah login)
TOKEN="eyJ..."

curl https://api.namabisnis.com/api/v1/businesses \
  -H "Authorization: Bearer $TOKEN"
```

### 5.4 Cek Logs Workers

```bash
npx wrangler tail --project-name=umkm-backend-workers
```

---

## 6. Troubleshooting

### Error: `Cannot parse SUPABASE_URL`

```
Error: Missing or invalid SUPABASE_URL. Make sure it is set with: npx wrangler secret put SUPABASE_URL
```

**Solusi:** Pastikan `wrangler secret put SUPABASE_URL` sudah dijalankan dan nilai URL valid (termasuk `https://`).

---

### Error: `Unauthorized` di semua endpoint

**Penyebab:** `JWT_SECRET` tidak cocok antara Supabase dan Workers, atau token expired.

**Solusi:**
1. Cek `JWT_SECRET` di Wrangler secrets sama persis dengan JWT Secret di Supabase Dashboard.
2. Pastikan token yang dikirim dari frontend masih valid (cek expiry di [jwt.io](https://jwt.io)).

---

### Error: `Relation does not exist`

```
error: relation "public.businesses" does not exist
```

**Penyebab:** Schema Supabase belum dijalankan.

**Solusi:** Jalankan [`supabase-rls.sql`](./supabase-rls.sql) di SQL Editor Supabase. Pastikan project URL di secrets sudah benar.

---

### Error: CORS blocked

```
Access to fetch at 'https://api.namabisnis.com' from origin 'https://namabisnis.com' has been blocked by CORS policy
```

**Penyebab:** `ALLOWED_ORIGIN` di backend tidak mencakup origin frontend.

**Solusi:**
1. Cek nilai `ALLOWED_ORIGIN` di `backend-workers/.env`
2. Pastikan domain frontend persis sama (perhatikan `www` vs non-`www`)
3. Redeploy backend: `cd backend-workers && npx wrangler deploy`

---

### Error: `wrangler deploy` gagal dengan `Service role key is required`

**Solusi:** Jalankan `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` sebelum deploy. Secret tidak di-read dari `.env` file — harus di-set via `wrangler secret put`.

---

### Error: Frontend API calls return 404

**Penyebab:** `PUBLIC_API_URL` di `frontend/.env` belum di-update ke URL production.

**Solusi:**
1. Edit `frontend/.env`:
   ```env
   PUBLIC_API_URL=https://api.namabisnis.com
   ```
2. Rebuild: `cd frontend && npm run build`
3. Redeploy ke Cloudflare Pages

---

### Error: `npx wrangler pages deploy` not found

**Solusi:** Install wrangler globally atau gunakan npx dari project folder frontend. Pastikan `wrangler` ada di `frontend/package.json` devDependencies, atau install globally:

```bash
npm install -g wrangler
```

---

### Error: KV Namespace not found

```
Error: The Workers KV namespace "RATE_LIMIT_KV" is not set up.
```

**Solusi:** Pastikan `wrangler.toml` memiliki binding KV yang benar. Binding sudah dikonfigurasi di `backend-workers/wrangler.toml` dengan ID `b053885b3e9e427988a40d2df107e575`. Jika KV namespace perlu dibuat ulang:

```bash
cd backend-workers
npx wrangler kv:namespace create RATE_LIMIT_KV
# Copy output ID ke wrangler.toml [[kv_namespaces]] binding
```

---

### Error: Build Gagal — "Module not found"

**Penyebab:** Dependencies belum terinstall.

**Solusi:**
```bash
# Backend
cd backend-workers && npm install

# Frontend
cd frontend && npm install
```

---

### Error: Port Already in Use (Wrangler local dev)

```
Error: listen EADDRINUSE 0.0.0.0:8787
```

**Solusi:**
```bash
# Cari proses yang menggunakan port
lsof -i :8787

# Kill proses terkait
kill -9 <PID>
```

---

## Checklist Deploy Production

- [ ] Supabase project sudah dibuat
- [ ] `supabase-rls.sql` sudah dijalankan di SQL Editor
- [ ] Semua secrets sudah di-set via `wrangler secret put`
- [ ] `backend-workers/.env` memiliki `ALLOWED_ORIGIN` yang benar
- [ ] `frontend/.env` memiliki `PUBLIC_API_URL` production
- [ ] Backend di-deploy: `npx wrangler deploy`
- [ ] Frontend di-build: `npm run build`
- [ ] Frontend di-deploy ke Cloudflare Pages
- [ ] Health check `/health` mengembalikan 200
- [ ] CORS test berhasil dari origin frontend
- [ ] Dokumentasi API `/docs` dapat diakses (dengan Basic Auth)

---

*Terakhir diupdate: $(date +%Y-%m-%d)*
