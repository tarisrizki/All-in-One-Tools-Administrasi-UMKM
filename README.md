# 🏪 All-in-One Tools Administrasi UMKM

Aplikasi PWA all-in-one untuk UMKM Indonesia: kasir/POS, stok, keuangan, dan laporan dalam satu aplikasi.

> **Status:** MVP & Core Features (Batch A-G) Completed
> **Current Version:** v1.0.0-beta

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | SvelteKit (Svelte 5 / Runes) + Tailwind CSS v4 |
| **Backend** | Cloudflare Workers (Hono) |
| **Database** | Supabase (PostgreSQL 15+) |
| **PWA** | @vite-pwa/sveltekit |
| **CI/CD** | GitHub Actions |

## Arsitektur Baru
Backend yang sebelumnya menggunakan Node.js (Fastify) telah dimigrasikan ke **Cloudflare Workers**. Database lokal PostgreSQL diganti menggunakan **Supabase** (BaaS) agar mendukung skalabilitas, keamanan, dan deployment yang lebih modern. Lihat file `MIGRATION-NOTES.md` untuk rincian migrasi.

## Quick Start

### Prerequisites
- Node.js ≥ 20.x
- Git
- Akun Cloudflare & Supabase

### 1. Setup Backend (Workers)
```bash
cd backend-workers
npm install

# Buat file .env dari .env.example (Hanya untuk local dev!)
cp .env.example .env

# Tambahkan secrets ke Wrangler
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put JWT_SECRET

# Jalankan server lokal
npm run dev
```
Backend API akan berjalan di `http://localhost:8787`

### 2. Setup Frontend
```bash
cd frontend
npm install

# Buat file .env dari .env.example
cp .env.example .env

# Jalankan frontend
npm run dev
```
Frontend akan berjalan di `http://localhost:5173`

## Deploy ke Production

Aplikasi ini menggunakan infrastruktur serverless.

**Backend (Cloudflare Workers)**:
```bash
cd backend-workers
npx wrangler deploy
```

**Frontend (Cloudflare Pages)**:
Frontend ini telah dikonfigurasi menggunakan `@sveltejs/adapter-cloudflare`. Untuk men-deploy:
1. Hubungkan repository GitHub ini ke **Cloudflare Pages** melalui dashboard Cloudflare.
2. Set Build Command: `npm run build`
3. Set Build Output Directory: `.svelte-kit/cloudflare`
4. Set Environment Variables di dashboard:
   - `PUBLIC_API_URL` (contoh: `https://backend-workers.<username>.workers.dev`)
5. Deploy.

## Dokumentasi Proyek

| Dokumen | Deskripsi |
|---|---|
| `Prd allinone tools administrasi umkm.MD` | Product Requirements Document |
| `DESIGN.MD` | Design System & Token |
| `Technical specification allinone umkm.MD` | Technical Specification |
| `MIGRATION-NOTES.md` | Catatan Migrasi Backend (Baru) |

## Struktur Proyek

```
UMKM/
├── frontend/          # SvelteKit PWA
├── backend-workers/   # Cloudflare Workers API
├── .github/workflows/ # CI/CD Pipeline
└── [docs...]          # Dokumentasi proyek
```
