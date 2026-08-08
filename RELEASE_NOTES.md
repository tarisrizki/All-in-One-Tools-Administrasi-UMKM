# Release Notes — Beres UMKM v1.1.0-beta

> 🎉 Rilis dengan daftar fitur lengkap sistem kasir untuk UMKM Indonesia (mengacu pada set fitur Qasir).

---

## Highlights

### 💳 Kasir POS Multi-Perangkat
Aplikasi kasir yang jalan di smartphone, tablet, desktop, hingga dual screen. Cetak struk bukti pembayaran, tiket pesanan pelanggan, dan dukungan pembayaran QRIS.

### 📦 Inventori Lengkap
Kelola produk, stok, bahan baku, harga modal, harga grosir, hingga pengingat kedaluarsa. Export & ubah produk sekaligus (bulk).

### 📊 Laporan Real-Time
Laporan penjualan, perputaran stok, dan profit-loss dalam satu aplikasi. Periode akses laporan fleksibel.

### 🏪 Multi-Outlet
Kelola outlet utama dan outlet cabang dari satu dashboard.

### 👥 Pegawai & Otorisasi
Akses pegawai berbasis peran (role-based), otorisasi per fitur, absensi, dan penugasan pegawai ke transaksi tertentu.

### 🎯 Strategi Bisnis
Diskon & poin loyalitas pelanggan untuk mendorong repeat purchase.

### 🔄 Atomic Sync
Setiap perubahan data disinkronkan secara atomic — semua atau tidak sama sekali. Tidak ada lagi data corrupt atau transaksi yang hilang saat sync terputus di tengah jalan.

### 🔒 RLS Security
Row Level Security (RLS) memastikan setiap user hanya bisa melihat dan mengelola data yang menjadi haknya.

---

## Tech Stack Summary

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | SvelteKit (Svelte 5 / Runes) + Tailwind CSS v4 + PWA |
| **Backend** | Cloudflare Workers (Hono + TypeScript, OpenAPI) |
| **Auth** | JWT access (8 jam) + refresh (30 hari), bcrypt/WebCrypto PBKDF2 |
| **Database** | Supabase PostgreSQL dengan Row Level Security (RLS) |
| **Sync Engine** | Dexie IndexedDB offline-first, push/pull atomic |
| **Deployment** | Cloudflare Workers + Cloudflare Pages |

---

## Changelog Ringkas

### v1.1.0-beta (2026-08) — Feature Set Lengkap
- Roadmap fitur Qasir: pajak per produk, tipe order + biaya layanan, status order, tiket pesanan, pengaturan meja, pre-order uang muka, nomor antrian, label pembayaran
- Inventori: export/ubah massal, bahan baku, harga grosir, pengingat kedaluarsa
- Laporan perputaran stok, multi-outlet, absensi pegawai

### v1.0.0 (2026-08-08) — Core MVP
- Kasir POS online + offline dengan sync otomatis, QRIS, cetak struk
- Manajemen produk, stok multi-gudang, purchase order
- Cashbook, piutang/hutang dengan cicilan
- Role-based access & otorisasi pegawai
- Multi-device real-time, RLS security, refresh token

---

## Demo

> **TODO:** Tambahkan link demo di sini

---

## Instalasi

```bash
# Clone repository
git clone https://github.com/username/umkm-audit.git
cd umkm-audit

# Setup backend (Cloudflare Workers)
cd backend-workers
npm install
cp .env.example .env

# Setup frontend
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

Lihat [README.md](./README.md) dan [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) untuk panduan lengkap.

---

## Catatan Penting

- **Backup rutin** — Backup database secara berkala tetap disarankan.
- **Update reguler** — Selalu update ke versi terbaru untuk keamanan dan fitur terbaru.
- **Dokumentasi** — Kunjungi [README.md](./README.md) untuk informasi lebih lengkap.

---

_Dibuat dengan ❤️ untuk UMKM Indonesia_
