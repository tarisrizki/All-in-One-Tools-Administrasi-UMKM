# Beres UMKM Reverse Spec

Tanggal audit: 2026-08-09

## 1. Ringkasan Eksekutif

| Severity | Count | Ringkas |
|---|---:|---|
| P0 | 1 | Kontrak `roles` rusak: source memakai `roles.business_id`, schema aktif tidak punya kolom itu. |
| P1 | 4 | Inventory masih mutable tanpa stock ledger; sync/outbox belum lengkap; POS session/order lifecycle belum ada; outlet scope belum terpisah. |
| P2 | 4 | Receipt snapshot, attendance, batch/expiry, wholesale/recipe belum ada. |
| Info | 3 | Auth middleware, idempotent sale RPC, dan permission gating sudah ada di banyak route. |

## 2. Temuan

[CRITICAL] Kontrak `roles` rusak antara source dan schema aktif
File: `backend-workers/src/index.ts:199`, `backend-workers/src/modules/roles.ts:124-218`, `backend-workers/src/modules/auth.ts:199,328`, `backend-workers/src/middleware/auth.ts:53-58`, `supabase-rls.sql:38-42,300`, hasil query schema aktif Supabase `roles(id,name,permissions,created_at)`
Issue: Source memakai `.eq('business_id', businessId)` pada `roles`, tetapi tabel `roles` di schema aktif tidak punya kolom `business_id`. Route list/create/update/delete, backup cron, dan auth lookup tidak selaras dengan DB aktual.
Fix: Pilih satu model dan migrasikan eksplisit. Opsi paling aman: tambahkan `business_id nullable` untuk role tenant, pertahankan role global tanpa business scope, atau pindahkan scope ke tabel relasi `user_roles`. Setelah migration, perbaiki semua query dan seed.

[HIGH] Inventory masih saldo mutable, belum immutable ledger
File: `supabase-rls.sql:93-100,125-158,315-483`, `backend-workers/src/modules/sales.ts:200-241`, `backend-workers/src/modules/purchases.ts:282-319`
Issue: Stok disimpan sebagai `product_stock.quantity` dan dimutasi langsung saat sale/purchase. Tidak ada tabel movement ledger, reversal trail, atau audit per transaksi stok.
Fix: Tambah `stock_movements`/`inventory_ledger` dengan `source_type`, `source_id`, `warehouse_id`, `quantity_delta`, `unit_cost`, `created_by`, `created_at`. Jadikan `product_stock` projection saja.

[HIGH] POS belum punya session/closing model
File: `docs/EVIDENCE-MATRIX.md`, `backend-workers/src/modules/sales.ts`, `supabase-rls.sql`
Issue: Tidak ada `pos_sessions`, opening cash, closing cash, cash variance, atau consolidated closing voucher. `sales.status` hanya draft/paid/partial dan tidak memodelkan shift register.
Fix: Tambah session table dan closing RPC, lalu pindahkan rekonsiliasi kas/laporan harian ke closing flow.

[HIGH] Sync offline belum punya outbox contract lengkap
File: `frontend/src/lib/db.ts:40-79`, `frontend/src/lib/stores/sync.svelte.ts:65-128`, `backend-workers/src/modules/sync.ts:19-30,155-257`
Issue: Client menyimpan pending transactions di Dexie dan push dalam satu batch; backend memproses maksimal 100 transaksi, tetapi belum ada per-item ack schema, retry counter, dead-letter, atau conflict UI.
Fix: Tambah status per transaksi (`pending/pushed/failed/conflicted`), retry counter, dan response per item dari `/sync/push`.

[HIGH] Role validation route masih mengasumsikan scope tenant yang belum ada di schema
File: `backend-workers/src/modules/roles.ts:117-218`, `backend-workers/src/modules/employees.ts:168-176`
Issue: `roles.ts` filter bisnis dan employee create mengharuskan role bisnis, tetapi DB aktif tidak mendukung itu. Ini mematahkan admin flow dan backup flow.
Fix: Selaraskan role model dengan schema aktif sebelum menambah permission granularity.

[MEDIUM] Permission coverage belum lengkap untuk beberapa route operasional
File: `backend-workers/src/modules/sync.ts:85-257`, `backend-workers/src/modules/settings.ts:185`, `backend-workers/src/modules/health.ts`
Issue: `sync` hanya butuh auth, tidak ada permission terpisah; beberapa route administratif tidak dipisah cukup halus dari read-only flow.
Fix: Tambahkan permission yang jelas untuk sync dan operasi sensitif lain.

[MEDIUM] Receipt template belum disimpan sebagai snapshot server-side
File: `frontend/src/lib/utils/printer.ts`, `backend-workers/src/modules/sales.ts`
Issue: Struk dirender dari data client-side tanpa snapshot receipt version di transaksi.
Fix: Simpan receipt payload atau template version pada sales record.

[MEDIUM] Attendance/outlet hierarchy/batch-expiry belum ada
File: `supabase-rls.sql`, `backend-workers/src/modules/*`
Issue: Fitur yang ada di benchmark pasar belum punya model data inti.
Fix: Tambah model bertahap sesuai prioritas vertikal.

## 3. Yang Sudah Bersih

- SQL injection: CLEAN. Akses DB lewat Supabase JS/RPC, bukan string SQL mentah di route.
- Permission gating: sebagian besar route bisnis sudah memakai `authMiddleware` + `requirePermission`.
- Idempotency sale: CLEAN. `sales.client_transaction_id` UNIQUE dan `process_sale()` mengembalikan duplicate jika transaksi sudah ada.
- Concurrent stock decrease: relatif aman di sale RPC karena ada `FOR UPDATE` pada `product_stock`.
- Input sync `since`: CLEAN. `sync.ts` memvalidasi tanggal dengan `isNaN(new Date(since).getTime())`.
- Batch size sync: CLEAN. `transactions` dibatasi `max(100)`.
- Runtime portability: CLEAN untuk env abstraction `getEnv()` dan Node self-host entrypoint.

## 4. Observed Requirements (EARS)

- The system shall reject requests without a valid JWT.
- When a role lacks the required permission, the system shall return HTTP 403.
- When a sale uses an existing `client_transaction_id`, the system shall treat it as duplicate and not create a second sale.
- When stock is insufficient, the system shall reject the sale transaction.
- When `/sync/pull` receives an invalid `since`, the system shall return HTTP 400.
- Where transaction batching is used, the system shall limit offline push to 100 transactions per request.

## 5. Acceptance Criteria yang Tersirat

1. Login/register/refresh/logout endpoints tetap berfungsi setelah role schema diselaraskan.
2. Sale create tetap atomic, idempotent, dan tidak oversell.
3. Purchase receive tetap menambah stock secara atomic.
4. Sync pull/push tetap konsisten saat offline queue panjang.
5. Multi-outlet/employee flow tidak membocorkan data antar bisnis.

## 6. Uncertainties

- Apakah model role yang diinginkan adalah role global + tenant, atau role per business sepenuhnya.
- Apakah stock ledger akan menggantikan `product_stock` sepenuhnya atau dipakai sebagai projection.
- Apakah session kasir diperlukan untuk semua vertical atau hanya F&B/retail tertentu.

## 7. Recommendation Prioritas

### P1
- Selaraskan `roles` contract dengan schema aktif.
- Tambahkan stock movement ledger.
- Tambahkan POS session/closing.
- Tambahkan outbox sync contract.

### P2
- Tambahkan outlet hierarchy.
- Tambahkan receipt snapshot/version.
- Tambahkan batch/expiry dan wholesale pricing.

### P3
- Tambahkan attendance dan task assignment.
- Tambahkan kitchen ticket/table/queue untuk vertical F&B.

## Approval:
Audit ini berbasis source, schema aktif, route, middleware, runtime, build, dan literature/OSS pembanding. P0 harus diselesaikan via migration terencana sebelum fitur baru yang bergantung pada role scope.