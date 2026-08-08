# Release Notes — KasirPOS v1.0.0

> 🎉 Rilis pertama! Sistem POS offline-first open-source untuk UMKM Indonesia.

---

## Highlights

### ✨ Offline-First POS
Berjualan tanpa internet? Bisa! KasirPOS menyimpan semua transaksi secara lokal dan melakukan sync ketika koneksi kembali tersedia. Manajemen stok tetap akurat kapan pun dan di mana pun.

### 🔄 Atomic Sync
Setiap perubahan data disinkronkan secara atomic — semua atau tidak sama sekali. Tidak ada lagi data corrupt atau transaksi yang hilang saat sync terputus di tengah jalan.

### 📱 Multi-Device Real-Time
Pantau penjualan dari beberapa perangkat secara bersamaan. Saat kasir di meja kasir mencatat transaksi, owner bisa memantau omzet dari HP secara real-time tanpa perlu refresh.

### 🔒 RLS Security
Row Level Security (RLS) memastikan setiap user hanya bisa melihat dan mengelola data yang menjadi haknya. Data bisnis Anda aman, hanya untuk mata yang berhak.

### 🔑 Refresh Token
Mekanisme autentikasi modern dengan refresh token untuk pengalaman login yang aman dan seamless. Session tetap aktif, tanpa harus login berulang kali.

### 📊 Cashbook Summary
Ringkasan kas masuk dan kas keluar dalam satu tampilan. Lacak profitabilitas bisnis Anda setiap hari, minggu, atau bulan dengan mudah.

### 🌐 Open-Source Gratis untuk UMKM Indonesia
Didedikasikan untuk kemajuan UMKM Indonesia. 100% open-source, bebas digunakan dan dimodifikasi. Mari bangun ekosistem digital bersama.

---

## Tech Stack Summary

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Next.js 15 + React 19 + TypeScript + Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Edge Functions + Realtime) |
| **Auth** | Supabase Auth (Email + Refresh Token) |
| **Database** | PostgreSQL dengan Row Level Security (RLS) |
| **Sync Engine** | Atomic upsert dengan conflict resolution |
| **Realtime** | Supabase Realtime WebSocket |
| **Deployment** | Docker + Vercel / Railway |

### Dependensi Utama

- `next@15` — React framework
- `@supabase/supabase-js@2` — Database & auth client
- `@supabase/realtime-js@2` — Realtime subscriptions
- `tailwindcss@3` — Utility-first CSS
- `react-hot-toast@2` — Notification toasts
- `lucide-react@0.4` — Icon library

---

## Demo

> **TODO:** Tambahkan link demo di sini
>
> Demo Online: `[DEMO_URL_PLACEHOLDER]`

---

## Kontributor

Proyek ini dibangun oleh komunitas. Terima kasih kepada semua yang berkontribusi!

> **TODO:** Tambahkan nama kontributor di sini
>
> - [@contributor1](https://github.com/contributor1)
> - [@contributor2](https://github.com/contributor2)
> - [@contributor3](https://github.com/contributor3)

Ingin berkontribusi? Buka Pull Request atau buat Issue di repository kami.

---

## Instalasi

```bash
# Clone repository
git clone https://github.com/username/kasirpos.git
cd kasirpos

# Setup environment
cp .env.example .env.local

# Jalankan dengan Docker
docker-compose up -d

# Atau jalankan development
npm install
npm run dev
```

Lihat [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) untuk panduan deployment lengkap.

---

## Changelog

### v1.0.0 (2025) — Initial Release

#### Features
- Sistem POS offline-first dengan sync otomatis
- Multi-device real-time updates
- Cashbook (laporan kas masuk/keluar)
- Autentikasi dengan refresh token
- RLS security untuk multi-user
- UI responsif untuk desktop dan mobile

#### Technical
- Migrasi database dengan RLS policies
- Atomic sync engine
- Edge functions untuk backend logic
- Docker support untuk production

---

## Catatan Penting

- **Backup rutin** — Meskipun sistem ini handal, backup database secara berkala tetap disarankan.
- **Update reguler** — Selalu update ke versi terbaru untuk keamanan dan fitur terbaru.
- **Dokumentasi** — Kunjungi [README.md](./README.md) untuk informasi lebih lengkap.

---

_Dibuat dengan ❤️ untuk UMKM Indonesia_
