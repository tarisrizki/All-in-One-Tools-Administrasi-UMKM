# Task Tracker — All-in-One-Tools-Administrasi-UMKM (Beres)

Terakhir update: 2026-08-09 · Repo: `C:\Users\Dragon\umkm-audit`

Cara pakai:
- Centang `[x]` saat selesai. Setiap baris punya bukti (file/commit/test).
- **12 workstream (WS-01..WS-12)** = satu subagen per workstream, semua bisa jalan paralel.
- Subagen WAJIB: baca file scope, kerjakan, verifikasi (tsc/build/test), laporkan `[x]` + bukti. Jangan klaim selesai tanpa bukti.

---

## Selesai (sebelum task.md dibuat)

- [x] Env abstraction `getEnv()` Workers+Node — `backend-workers/src/utils/env.ts`
- [x] Node entrypoint self-host — `server.node.ts`, build:node 3.2MB
- [x] Rate limit fallback in-memory (auth 429 terverifikasi di Node)
- [x] Frontend adapter-static → nginx — `npm run build` ✔
- [x] Cron backup harian di Node
- [x] Privilege escalation role global — `employees.ts`
- [x] Kategori tanpa permission — `categories.ts`
- [x] Dashboard tanpa permission — `reports.ts`
- [x] Harga dari client (price=0) — `sales.ts` ambil `sell_price` DB
- [x] 23505 salah-skip — `sync.ts` verifikasi existing
- [x] Search injection `.or()` — `products.ts`/`customers.ts` escape
- [x] Test IDOR 4/4 pass
- [x] Docs produk (README/MARKETING/FAQ/RELEASE_NOTES/CHANGELOG/ARCHITECTURE) — commit `f03ccb9`
- [x] DEPLOY self-host Proxmox + security checklist — commit `ab83d8a`
- [x] Evidence Matrix (17 sumber, 15 area) — `docs/EVIDENCE-MATRIX.md`
- [x] Reverse Spec (P0-P3, EARS) — `docs/BERES_REVERSE_SPEC.md`
- [x] Graphify: AST 996/1713 → graph 883/1559/153 → Obsidian 1036 notes + benchmark 24.2x
- [x] Landing: first viewport 100vh, CTA Register, demo login tersembunyi

---

## Workstream — 12 Subagen Paralel

### WS-01 · Kontrak `roles` (P0)
- [ ] Migration: `roles.business_id nullable` (atau tabel relasi user_roles)
- [ ] Update semua query: `roles.ts`, `employees.ts`, `index.ts:199`, `auth.ts`, `middleware/auth.ts`
- [ ] Seed role owner/cashier/admin tetap berfungsi
- [ ] RLS policy roles disesuaikan
- [ ] Test: role CRUD + employee create + backup cron
- Files: `supabase-rls.sql`, `backend-workers/src/modules/{roles,employees,auth}.ts`, `backend-workers/src/middleware/auth.ts`, `backend-workers/src/index.ts`
- Verifikasi: migration jalan di Supabase MCP, vitest pass, backup tidak error `roles.business_id`

### WS-02 · Stock Movement Ledger (P0)
- [ ] Tabel `stock_movements` (source_type, source_id, warehouse_id, qty_delta, unit_cost, created_by)
- [ ] RPC `process_sale` tulis ledger + update `product_stock` (tetap atomik, FOR UPDATE)
- [ ] Purchase receive tulis ledger
- [ ] Opname/adjustment tulis ledger
- [ ] `product_stock` jadi projection (bukan sumber kebenaran)
- Files: `supabase-rls.sql`, `backend-workers/src/modules/{sales,purchases}.ts`
- Verifikasi: transaksi sale → ledger bertambah, saldo konsisten, no negative stock

### WS-03 · POS Session / Closing (P1)
- [ ] Tabel `pos_sessions` (opening cash, closing cash, variance, user, status)
- [ ] Route open/close session
- [ ] Sales terikat ke session
- [ ] Report rekonsiliasi kas per session
- Files: `supabase-rls.sql`, `backend-workers/src/modules/sales.ts` (+ `pos_sessions.ts` baru)
- Verifikasi: buka session → transaksi → tutup → variance benar

### WS-04 · Outbox Sync Lengkap (P1)
- [ ] Status per transaksi: pending/pushed/failed/conflicted (Dexie)
- [ ] Retry counter + backoff
- [ ] Response per item dari `/sync/push` (bukan skip diam-diam)
- [ ] Dead-letter + tombol retry manual di UI
- [ ] Pagination pull (`since` + limit + next cursor)
- Files: `frontend/src/lib/{db.ts,stores/sync.svelte.ts}`, `backend-workers/src/modules/sync.ts`
- Verifikasi: 150 transaksi offline → push 2 batch → semua masuk, conflict terlihat di UI

### WS-05 · Order Lifecycle F&B (P1)
- [ ] Tabel `orders` (type: dine-in/takeaway/delivery/preorder, status lifecycle)
- [ ] Service fee + deposit
- [ ] Table management + queue number
- [ ] Kitchen ticket (KDS-ready)
- [ ] Konversi order → sale saat payment
- Files: `supabase-rls.sql`, `backend-workers/src/modules/orders.ts` (baru), frontend POS
- Verifikasi: pre-order dibuat → kitchen → bayar → sale tercipta, stok terpotong sekali

### WS-06 · Payment Intent / QRIS (P1)
- [ ] Tabel payment status/provider/reference + callback events
- [ ] Webhook idempotent (callback ID unique)
- [ ] Status reconciliation (menunggu/dibayar/gagal/refund)
- [ ] Secret PSP tidak pernah di frontend
- Files: `supabase-rls.sql`, `backend-workers/src/modules/payments.ts` (baru), `.env.example`
- Verifikasi: callback ganda tidak double-count; payment pending bisa diverifikasi statusnya

### WS-07 · Outlet Hierarchy (P1)
- [ ] Tabel `outlets` (parent/child) — bedakan dari warehouse
- [ ] user ↔ outlet assignment
- [ ] Scope authorization: permission per outlet
- [ ] Sales/Purchase terikat outlet
- Files: `supabase-rls.sql`, `backend-workers/src/modules/{sales,employees}.ts`, middleware auth
- Verifikasi: user outlet A tidak bisa akses data outlet B (test IDOR baru)

### WS-08 · Stock Opname + Adjustment (P1)
- [ ] Tabel `stock_opnames` + `stock_opname_items`
- [ ] Workflow: draft → count → variance → approval
- [ ] Adjustment reason wajib
- [ ] Variance report
- Files: `supabase-rls.sql`, `backend-workers/src/modules/opname.ts` (baru)
- Verifikasi: opname 10 item, 2 beda → variance tercatat, ledger adjustment ter-post

### WS-09 · Batch/Expiry + Wholesale (P2)
- [ ] Batch/lot pada purchase (purchase date, expiry)
- [ ] Expiry reminder (FEFO report)
- [ ] Price list grosir (min qty → harga)
- [ ] Sales otomatis pilih batch FEFO
- Files: `supabase-rls.sql`, `backend-workers/src/modules/{purchases,sales,products}.ts`
- Verifikasi: 2 batch beda expiry → sale ambil yang paling awal

### WS-10 · Receipt Snapshot + Printer (P2)
- [ ] Simpan receipt payload immutable per sale (reprint konsisten)
- [ ] Template version di sales record
- [ ] Test printer thermal/browser tetap jalan
- Files: `supabase-rls.sql`, `backend-workers/src/modules/sales.ts`, `frontend/src/lib/utils/printer.ts`
- Verifikasi: reprint struk lama = sama persis dengan saat transaksi

### WS-11 · Hardening (Body Limit, is_active, Env) (P1/P2)
- [ ] Body size limit middleware global (~5MB)
- [ ] `z.array().max()` untuk items/payments
- [ ] Cek `is_active` user per request sensitif (bukan hanya token TTL)
- [ ] Pagination cap di semua list endpoint
- [ ] Hapus sisa `c.env` langsung (grep audit = 0)
- Files: `backend-workers/src/index.ts`, `backend-workers/src/middleware/*.ts`, semua module
- Verifikasi: request >5MB → 413; user nonaktif → 401; grep `c.env.` = 0

### WS-12 · Konsolidasi Riset 12 Jalur (Research)
- [ ] Kumpulkan hasil 12 subagen riset (OSS + jurnal + QRIS/BI)
- [ ] Merge ke `docs/EVIDENCE-MATRIX.md` (tambah baris area baru)
- [ ] Sitasi sync dengan citation ledger (`sources.py`)
- [ ] Tandai `source_verified` vs `market_claim` konsisten
- [ ] Update `docs/BERES_REVERSE_SPEC.md` jika ada keputusan baru
- Files: `docs/EVIDENCE-MATRIX.md`, `docs/BERES_REVERSE_SPEC.md`, `task.md`
- Verifikasi: `sources.py verify` hijau (di luar keterbatasan parser tabel), tidak ada klaim tanpa bukti

---

## Pengerjaan Paralel

| Gelombang | Workstream | Ketergantungan |
|---|---|---|
| 1 (sekarang) | WS-01, WS-02, WS-03, WS-04, WS-05, WS-06, WS-07, WS-08, WS-09, WS-10, WS-11, WS-12 | Semua independen (beda tabel/file) |
| 2 | Integrasi + regresi penuh | Setelah WS-01..WS-11 |

Aturan: WS yang menyentuh `supabase-rls.sql` (01,02,03,05,06,07,08,09,10) → masing-masing bikin **file migration terpisah** (`supabase/migrations/ws-NN-*.sql`) supaya tidak konflik merge. WS-04 & WS-11 hanya backend/frontend code.

## Blocker
- `SUPABASE_SERVICE_ROLE_KEY` asli tidak ada di `.env` lokal → verifikasi e2e Node penuh butuh key dari dashboard user.
- `sources.py verify` tidak membaca sitasi dalam tabel markdown → kegagalan mekanis, bukan salah sitasi.
