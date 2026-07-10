# Migrasi Skema ke Supabase (Fase 4)

Semua file dari `backend/db/migrations/*.sql` telah disalin dan dijalankan di instance Supabase baru.

## Koneksi Database
- Driver: `@supabase/supabase-js` (REST API)
- Auth: Menggunakan `SUPABASE_SERVICE_ROLE_KEY` (diinjeksikan via Wrangler Secrets, JANGAN disimpan di `.dev.vars` yang ter-commit).

## Perbedaan & Catatan
- Autentikasi aplikasi menggunakan JWT buatan sendiri (Hono JWT) seperti pada backend Fastify lama.
- Supabase bertindak murni sebagai Database/BaaS tanpa menggunakan Supabase Auth (GoTrue).
- Pekerjaan kompleks yang tidak bisa diselesaikan dengan sekali insert/update via REST akan dibuatkan fungsi RPC (Stored Procedure) di masa mendatang untuk menjamin keutuhan data (ACID).

## Menjalankan Migrasi Baru
Di masa depan, perubahan skema database dapat dilakukan melalui Drizzle Kit yang menunjuk langsung ke connection string (Postgres URI) Supabase, atau langsung dieksekusi di SQL Editor Dashboard Supabase.
