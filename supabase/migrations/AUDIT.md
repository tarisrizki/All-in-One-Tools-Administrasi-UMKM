# Audit ws-*.sql vs supabase-rls.sql

Tanggal: 2026-08-09
Baseline: `supabase-rls.sql` (17 tabel core + stock_opnames/stock_movements, 21 RLS tables, RPC `process_sale`/`receive_purchase_order`/`pay_debt`/`approve_stock_opname`)
Scope: `supabase/migrations/ws-*.sql` (8 file, 1166 baris total). Tidak edit `supabase-rls.sql`.

## Ringkasan

- ws-01, ws-02, ws-03, ws-05: placeholder/komentar saja, tidak ada DDL aktif. Tidak ada konflik tabel/FK/RLS karena tidak dieksekusi. Risiko: jika diaktifkan tanpa revisi, FK salah dan RLS salah.
- ws-06, ws-08, ws-10: konsisten baseline, idempotent (`IF NOT EXISTS`/`DROP IF EXISTS`), fix minimal diterapkan.
- ws-09: tumpang tindih paling besar (override `receive_purchase_order` + `process_sale`, tabel baru). Butuh 6 fix minimal; masih perlu review urutan migrasi.
- Urutan migrasi hilang ws-04, ws-07 tidak ada file (hanya disebut di ws-03/ws-05 sebagai `outlets`/`printers`). Jika `outlets` dihidupkan, FK harus ke `businesses(id)` bukan `users(id)`.

## Temuan per file

### ws-01-roles-scope.sql — PLACEHOLDER (aman)
- Seluruh baris dikomentari (`--`). Tidak ada eksekusi.
- Jika diaktifkan: `ALTER TABLE roles ADD COLUMN business_id uuid REFERENCES users(id)` salah — harus `REFERENCES businesses(id)`. FK ke `users` memecah scoping `business_id`. Fix saat aktivasi: `REFERENCES businesses(id) ON DELETE SET NULL` + index.

### ws-02-stock-ledger.sql — PLACEHOLDER + corrupt header (di-fix)
- Sebelum fix: baris 1 literal `\n` (`-- ... (P0)\\n-- Immutable...`) corrupt. Di-fix ke header normal.
- Seluruh sisanya dikomentari (spec `stock_ledgers`/`log_stock_movement`). Tidak dieksekusi → tidak konflik.
- Jika diaktifkan: tabel `stock_ledgers` belum ada di baseline; `UPDATE product_stock ... business_id/product_code` salah (kolom tidak ada). Fix saat aktivasi: pakai `product_stock(warehouse_id, product_id)`.

### ws-03-pos-sessions.sql — PLACEHOLDER (aman, fix EOF)
- Komentar spec + `WS-07 outlets` (tidak ada file `ws-07`). Tidak ada DDL aktif.
- Fix: baris akhir bare `EOF` → `-- EOF` (hindari syntax error jika dijalankan).
- Jika diaktifkan: FK `business_id REFERENCES users(id)` semua salah, harus `businesses(id)`. `pos_sessions` sudah ada di baseline (21 kolom, status `open/closed`) — file ini duplikat/spesifikasi lama.

### ws-05-orders-lifecycle.sql — PLACEHOLDER (aman)
- Komentar spec `orders`/`order_items`/`order_status_history`/`tables`/`kitchen_tickets`/`printers`. Tidak dieksekusi → tidak konflik.
- Jika diaktifkan: semua `business_id/outlet_id REFERENCES users(id)/outlets(id)` salah; `outlets`/`printers` belum ada di baseline → FK akan gagal. Fix saat aktivasi: `business_id REFERENCES businesses(id)`, buat `outlets` dulu, rename `tables` → `restaurant_tables` (nama generik bentrok).

### ws-06-payment-intents.sql — AKTIF, fix minimal
- Tabel `payment_intents` (FK `businesses`, `sales`) + `payment_callbacks` baru, index, trigger `updated_at`, RLS `auth.uid()`. Idempotent OK, `$$` balanced, `callback_id` unik.
- Fix: tambah `Service Role Full Access` via `DO` (konsisten baseline; sebelumnya hanya user policy → service_role terblokir).
- Catatan: `payment_callbacks` INSERT `WITH CHECK (true)` terbuka untuk anon — intended untuk webhook, tapi butuh `TO authenticated`/`service_role` atau validasi `callback_id` di RPC agar tidak spam.

### ws-08-stock-opname.sql — AKTIF, fix RLS
- `CREATE TABLE IF NOT EXISTS` untuk `stock_movements`/`stock_opnames`/`stock_opname_items` duplikat baseline tapi `IF NOT EXISTS` → idempotent OK.
- RLS `ENABLE` + `Service Role Full Access` (3 tabel) + `User Business Scope` via `business_id`.
- Fix: `stock_opname_items` tidak punya `business_id` → `DO` loop `business_id IN (...)` akan error `column business_id does not exist`. Di-fix: hapus dari `pairs`, buat policy terpisah `opname_id IN (SELECT id FROM stock_opnames WHERE business_id IN (...))`.
- `trigger updated_at` untuk `stock_movements` salah (tabel tidak punya `updated_at` di baseline) → trigger akan error di PG jika di-update; fix next iteration: hapus atau tambah kolom `updated_at` ke `stock_movements` atau drop trigger untuk tabel itu.
- `cancel_stock_opname` menulis `stock_movements` type `opname_cancel` tapi `CHECK type IN ('sale','purchase','adjustment_in','adjustment_out','transfer_in','transfer_out')` akan reject — butuh `ALTER TYPE` tambah `'opname_cancel'` atau pakai `adjustment_in/out` dengan `reference_type='opname_cancel'`.
- Idempotency: `approve/cancel` guard `status` OK. Immutability: `stock_movements` insert-only (tidak ada UPDATE/DELETE policy) konsisten ledger.

### ws-09-batch-wholesale.sql — AKTIF, 6 fix minimal
- Tabel baru `product_batches`/`price_lists`/`price_list_items`, index, RLS, `ALTER TABLE purchase_order_items` tambah `batch_number`/`expiry_date`, `ALTER TABLE sale_items` tambah `batch_id`/`price_source`/`price_list_name`, RPC `receive_purchase_order` (override baseline + batch), `get_expiring_batches`, `consume_batch_fefo`, `get_applicable_price`, `process_sale` (override baseline + batch fields).
- Fix:
  1. Header `\\` (`-- ...\\`) → hapus (syntax error).
  2. `TO admin` (role tidak ada) → `TO authenticated` (3 policy). `EXECUTE format('CREATE POLICY ... TO admin')` sebelumnya akan error `role "admin" does not exist`.
  3. `EXISTS (... business_id = business_id)` tautologi → `u.business_id = product_batches.business_id` / `price_lists.business_id`.
  4. `OR business_id = (SELECT ...)` → `OR business_id IN (SELECT ...)` (subquery bisa multi-row).
  5. `receive_purchase_order` loop `SELECT ... cost_price ... GROUP BY cost_price` → `price` (kolom baseline `purchase_order_items.price`, bukan `cost_price`). Juga `SUM(qty)` loop pakai `price`.
  6. Second loop `SELECT product_id, qty, price, batch_number, expiry_date` tambah `id` (butuh `v_item.id` untuk `purchase_item_id FK`) + `cost_price` → `price` di INSERT.
- Sisa isu (tidak di-fix, butuh keputusan desain):
  - `price_list_items` RLS `price_list_items.business_id` tidak ada; di-fix ke `EXISTS (SELECT 1 FROM price_lists pl JOIN users ...)`. Teknik `EXECUTE format('... TO authenticated USING')` tanpa `WITH CHECK` → INSERT tanpa check.
  - `receive_purchase_order` override baseline: hilangkan `cost_price` grouping bisa ubah perilaku stock aggregation jika PO punya harga berbeda per line. Tertib migrasi: file ini harus run terakhir (override `process_sale`/`receive_purchase_order`).
  - `consume_batch_fefo` pakai `RETURN QUERY SELECT v_batch.id, ...` di dalam loop (PG 14+ `RETURN QUERY` di loop perlu `RETURN NEXT`; saat ini semantics duplikat). Plus `UPDATE` quantity tanpa `FOR UPDATE` / tanpa cek FEFO warehouse scope (`p_warehouse_id` tidak dipakai).

### ws-10-receipt.sql — AKTIF (aman)
- `ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_snapshot jsonb, receipt_template_version text` + `COMMENT`. Idempotent OK, tidak konflik baseline (`sales` sudah ada). RLS ikut baseline.

## Matriks konsistensi

| Check | Hasil |
|-------|-------|
| Duplicate table (CREATE IF NOT EXISTS) | OK (ws-08/09/10 idempotent). ws-08 duplikat baseline tapi tidak error. |
| FK ke tabel belum ada | ws-09 `product_batches.purchase_item_id → purchase_order_items` OK (baseline ada). ws-05 `outlets`/`printers` belum ada → jika diaktifkan akan error. |
| FK business_id scoping | Baseline `business_id REFERENCES businesses(id)` konsisten. ws-03/ws-05 placeholder `REFERENCES users(id)` salah — jangan aktifkan tanpa fix. ws-09 baru `REFERENCES businesses(id)` OK. |
| RLS business_id filter | ws-06/ws-08/ws-09 semua `business_id IN (SELECT business_id FROM users WHERE id = auth.uid())` OK kecuali ws-08 `stock_opname_items` (di-fix) dan ws-09 tautologi/TO admin (di-fix). |
| Idempotency `client_transaction_id` | `sales.client_transaction_id uuid UNIQUE` (baseline) + `process_sale` SELECT guard OK. Duplikat di ws-09 `process_sale` copy guard tetap ada. |
| Stock ledger immutability | `stock_movements` tanpa UPDATE/DELETE policy + insert via RPC `approve_stock_opname`/`receive_purchase_order` konsisten. |

## Fix yang diterapkan (minimal, tanpa rewrite besar)

- `ws-02`: normalisasi header `\n`.
- `ws-03`: `EOF` → `-- EOF`.
- `ws-06`: tambah `Service Role Full Access` untuk `payment_intents`/`payment_callbacks`.
- `ws-08`: RLS `stock_opname_items` via `opname_id` join.
- `ws-09`: header `\`, `TO admin`→`TO authenticated`, tautologi `business_id=business_id`, `business_id=`→`IN`, `cost_price`→`price` (2 tempat), tambah `id` ke batch SELECT. 1 `product_batches.business_id` ref tersisa (intended).

## Sisa TODO (tidak di-fix, perlu keputusan)

- `ws-08`: `stock_movements` trigger `updated_at` (kolom tidak ada) + `type='opname_cancel'` CHECK violation.
- `ws-09`: urutan migrasi (harus setelah baseline + setelah `ws-08`), `consume_batch_fefo` RETURN semantics & `p_warehouse_id` scope, `price_lists` WITH CHECK.
- `ws-01/02/03/05`: jika diaktifkan, perbaiki FK `business_id`→`businesses(id)` dan buat `outlets`/`printers` terlebih dulu.
