# Panduan Deployment (UMKM All-in-One)

Selamat! Aplikasi Anda sudah *production-ready*. Berikut adalah langkah-langkah praktis untuk menaikkan aplikasi ini ke VPS (Virtual Private Server) Anda secara mandiri menggunakan **Docker Compose** atau **Coolify** (berdasarkan spesifikasi di dokumen arsitektur Anda).

## Persiapan Server (VPS)
1. **Sewa VPS**: Minimal RAM 2GB (direkomendasikan 4GB), OS Ubuntu 22.04 / 24.04 LTS.
2. **Domain**: Siapkan nama domain (contoh: `umkmku.com`) dan arahkan (A Record) DNS ke IP publik VPS Anda.

---

## Opsi 1: Menggunakan Coolify (Direkomendasikan)
Coolify adalah alternatif *open-source* untuk Vercel/Heroku.

1. **Instal Coolify di VPS**:
   Buka terminal/SSH VPS Anda dan jalankan perintah:
   ```bash
   curl -fsSL https://get.coollabs.io/coolify/install.sh | bash
   ```
2. **Setup Coolify**:
   - Buka `http://<IP-VPS>:8000` di browser.
   - Buat akun admin lokal.
3. **Tambahkan Proyek**:
   - Hubungkan repositori GitHub Anda ke Coolify.
   - Pilih *Docker Compose* sebagai jenis *deployment*.
   - Arahkan ke file `docker-compose.prod.yml` yang sudah kita buat.
   - Set variabel lingkungan (*Environment Variables*) di dashboard Coolify, seperti `JWT_SECRET`, `POSTGRES_PASSWORD`, `PUBLIC_API_URL`, dsb.
4. **Deploy**:
   - Klik tombol **Deploy**. Coolify akan secara otomatis membuat *container* PostgreSQL, Redis, Backend, dan Frontend, serta memberikan sertifikat SSL (HTTPS) secara gratis lewat Let's Encrypt.

---

## Opsi 2: Menggunakan Docker Compose (Manual SSH)
Jika Anda lebih suka mengatur semuanya melalui terminal VPS langsung.

1. **Instal Docker & Git** di VPS:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose git -y
   ```
2. **Clone Repositori**:
   ```bash
   git clone https://github.com/<username-anda>/umkm-all-in-one.git
   cd umkm-all-in-one
   ```
3. **Buat File Konfigurasi**:
   Buat file `.env.production` di *root directory*:
   ```env
   NODE_ENV=production
   PORT=3000
   POSTGRES_DB=umkm_db_prod
   POSTGRES_USER=umkm_admin
   POSTGRES_PASSWORD=ganti_password_super_aman
   JWT_SECRET=rahasia_token_panjang_sekali
   PUBLIC_API_URL=https://api.umkmku.com
   CORS_ORIGIN=https://app.umkmku.com
   ```
4. **Jalankan Aplikasi**:
   Gunakan file *compose* produksi kita:
   ```bash
   sudo docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```
5. **Setup Reverse Proxy (Nginx + SSL)**:
   - Instal Nginx dan Certbot untuk mendapatkan HTTPS.
   - Arahkan Nginx untuk meneruskan trafik masuk (port 80/443) ke *port* aplikasi Frontend (`8080`) dan API Backend (`3000`).

---

## Tips Maintenance
- **Melihat Log**: 
  `docker logs umkm-backend-prod -f --tail 100`
- **Mereset Database (Hanya Saat Darurat/Kosong)**: 
  `docker-compose -f docker-compose.prod.yml down -v`
- **Update Kode Baru**:
  Tarik perubahan dari GitHub (`git pull`), lalu jalankan ulang perintah `up -d --build` (Opsi 2) atau cukup tekan "Deploy" ulang di Coolify (Opsi 1).

Semoga sukses dengan peluncuran aplikasi UMKM Anda ke pasar nyata!
