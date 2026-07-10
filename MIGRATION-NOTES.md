# Catatan Migrasi Backend (Node.js/Fastify -> Cloudflare Workers + Supabase)

## Perubahan Arsitektur
1. **Hosting API**: API backend sebelumnya dijalankan menggunakan Fastify di dalam kontainer Docker. Sekarang telah sepenuhnya dimigrasikan ke Cloudflare Workers (`backend-workers`).
2. **Database**: PostgreSQL lokal yang dijalankan melalui Docker telah digantikan oleh **Supabase**. Modul-modul backend berkomunikasi dengan Supabase secara langsung menggunakan Supabase JS Client (`@supabase/supabase-js`) atau REST API.
3. **Autentikasi**: Proses autentikasi tetap menggunakan JWT (via `hono/jwt`) tetapi sekarang beroperasi di edge network (Cloudflare).
4. **Penyimpanan Aset**: Modul pengaturan/logo dan aset lainnya yang sebelumnya diunggah ke *local disk* (`uploads/`) sekarang menggunakan **Supabase Storage**.
5. **Cadangan Data (Backup)**: Supabase paket *Free Tier* **tidak menyediakan** Point-in-Time Recovery (PITR) maupun *Daily Backups* otomatis (hanya tersedia di paket Pro). Oleh karena itu, *Cron Trigger* di Cloudflare Workers (`index.ts` & `wrangler.toml`) disiapkan sebagai mekanisme *fallback* untuk mengekspor atau membackup data ke penyimpanan pihak ketiga sesuai kebutuhan UMKM. **Catatan Penting**: Sebelum *cron backup* pertama kali berjalan, Anda diwajibkan untuk membuat *bucket* bernama `backups` secara manual di menu Storage Supabase Anda dan pastikan statusnya *private* (bukan *public*).

## Status Backend Lama
Folder `backend` lama telah dihapus (diremove dari source control, Phase 8) untuk menghindari utang teknis dan duplikasi. Jika diperlukan sewaktu-waktu, dapat direstore menggunakan histori Git:
```bash
git checkout <commit-sebelum-penghapusan> -- backend/
```

## Modul yang Direduksi/Ditunda
- **Artificial Intelligence (`ai.ts`)**: Modul yang bertugas memberikan ringkasan pintar (dengan Google Generative AI) secara sengaja **belum dimigrasikan** ke Workers pada MVP ini untuk merampingkan arsitektur serta menghemat *overhead* biaya/limitasi eksekusi LLM. Apabila fitur ini ingin dihidupkan kembali kelak, disarankan untuk mengintegrasikan library AI di siklus *update* selanjutnya.

## Referensi & Bantuan
- **Variabel Lingkungan (Environment Variables)**: Silakan lihat `.env.example` di dalam `frontend/` dan `backend-workers/` untuk mengonfigurasi proyek.
- Jika terdapat masalah di produksi, pastikan `PUBLIC_API_URL` di frontend menunjuk pada endpoint Workers, dan rahasia Supabase/Cloudflare telah terpasang dengan aman melalui `wrangler secret put`.
