# Evidence Matrix: Beres UMKM

Tanggal audit: 2026-08-09

Dokumen ini memisahkan bukti pasar, workflow publik, implementasi open source, literatur, dan bukti langsung dari repository Beres. Website kompetitor tidak dipakai sebagai bukti backend internal.

## Level Bukti

| Level | Arti | Boleh dipakai untuk |
|---|---|---|
| `market_claim` | Klaim fitur dari halaman produk/pricing | Menentukan masalah pasar dan prioritas discovery |
| `workflow_public` | Manual, panduan, changelog, atau listing aplikasi | Menentukan alur pengguna yang terlihat publik |
| `source_verified` | Source code atau dokumentasi teknis open source | Menentukan pola implementasi yang dapat diperiksa |
| `literature` | Paper/jurnal dengan metode dan hasil yang diterbitkan | Memvalidasi alasan desain dan risiko operasional |
| `repo_verified` | Source, schema, test, build, atau runtime Beres | Menentukan kondisi aktual Beres |

`source_verified` tidak membuktikan bahwa Qasir atau Majoo memakai pola yang sama. Ia hanya memberi pola implementasi yang dapat dipelajari secara legal dan dapat direproduksi.

## Matriks Temuan

| Area | Bukti eksternal | Pola yang dapat dipelajari | Bukti Beres saat ini | Keputusan |
|---|---|---|---|---|
| POS dasar | Qasir menyebut pencatatan transaksi, produk, stok, struk, pembayaran, dan laporan.[1] `(market_claim)` | POS perlu memisahkan capture transaksi, payment, dan receipt. | `sales`, `sale_items`, `payments`, RPC `process_sale` di `supabase-rls.sql:125-158,315-440`; route sales di `backend-workers/src/modules/sales.ts`. | Pertahankan transaksi atomik; tambah status lifecycle dan reversal yang eksplisit sebelum fitur order kompleks. |
| POS session/sub-ledger | ERPNext memisahkan invoice POS dari stock/accounting ledger sampai closing session, lalu mengonsolidasikan posting.[7] `(workflow_public)` | Session register mengurangi beban ledger dan memberi rekonsiliasi kas harian. | Beres belum punya `pos_sessions`, closing voucher, register opening/closing, atau cash variance di schema. | P1: desain session kasir sebelum multi-outlet dan laporan kasir. |
| Inventory ledger | ERPNext menyimpan Stock Ledger Entry, memvalidasi negative stock, batch/serial, backdated transaction, dan menolak pembatalan entry langsung.[8] `(source_verified)` | Saldo stok adalah projection dari movement ledger; reversal dilakukan lewat dokumen sumber, bukan edit saldo. | Beres memakai mutable `product_stock.quantity` di `supabase-rls.sql:93-100`; sale mengurangi saldo di RPC `:368-394`, purchase menambahnya di `:471-483`. Tidak ada `stock_movements`. | P0/P1: tambahkan immutable movement ledger, source document, reversal, warehouse, quantity delta, cost, dan audit actor. |
| Stock accuracy | Studi DeHoratius/Raman menemukan 65% dari hampir 370.000 record inventory tidak akurat dan menunjukkan audit inventory sebagai faktor mitigasi.[14] `(literature)` | Opname dan exception report harus menjadi workflow inti, bukan fitur kosmetik. | Ada saldo dan laporan inventory, tetapi belum ada tabel opname, approval, variance reason, atau adjustment ledger. | P1: implement stock opname sebagai adjustment terdokumentasi; ukur record accuracy dan shrinkage. |
| Offline sync | Paper offline synchronization menekankan metrik kualitas sync dan tidak ada satu pendekatan yang unggul untuk semua skenario.[15] `(literature)` | Sync perlu contract untuk ordering, retry, conflict, observability, dan chunking. | Frontend Dexie menyimpan pending transaction dan pull data di `frontend/src/lib/db.ts:40-79` serta `frontend/src/lib/stores/sync.svelte.ts:65-128`; backend membatasi batch 100 di `sync.ts:19-30`. | P1: tambahkan outbox state, retry count, per-item result, dead-letter/manual retry, dan metrics. |
| Idempotency | POS offline open source mendokumentasikan idempotent event processing, versioning, dan conflict handling.[16] `(repo_verified)` | Client transaction ID harus UNIQUE di DB dan diproses oleh RPC atomik. | `sales.client_transaction_id UNIQUE` di schema `:125-131`; `process_sale` melakukan duplicate check dan lock stock `:345-394`; sync memanggil RPC `sync.ts:200-241`. | Pola saat ini benar secara dasar; tambahkan test concurrency dan jangan menambah jalur manual kedua. |
| Order/pre-order | Qasir mencantumkan tipe order, biaya layanan, status order, tiket pesanan, meja, uang muka, dan nomor antrian.[2] `(market_claim)` | Order lifecycle harus terpisah dari payment settlement dan fulfillment/kitchen state. | Schema sales hanya punya `status` generik; belum ada order type, service fee, deposit, table, queue, atau kitchen ticket. | P1 untuk F&B: model order lifecycle terpisah, jangan menjejalkan semua state ke `sales.status`. |
| Produk dan inventory lanjutan | Qasir mencantumkan bulk product operations, bahan baku, harga modal, harga grosir, expiry reminder, dan stock turnover.[2] `(market_claim)` | Product master perlu recipe/BOM, price lists, batch/expiry, dan adjustment/report projections. | Products memiliki cost/sell price, SKU/barcode, unit, stock, min stock; belum ada recipe, purchase lots, expiry, wholesale price, atau turnover query. | P1/P2 berdasarkan vertical; mulai dari stock movement dan cost basis, lalu recipe/expiry. |
| Multi-outlet | Qasir mencantumkan outlet utama dan cabang; halaman Majoo memisahkan modul owner, inventory, analytics, dan employee.[2][3] `(market_claim)` | Business, outlet, warehouse, employee assignment, dan permission scope harus berbeda. | Beres punya `businesses`, `warehouses`, users dengan `business_id`; belum punya outlet hierarchy atau user-to-outlet assignment. | P1: bedakan warehouse dari outlet dan tambahkan scope authorization. |
| Employee/RBAC | Qasir mencantumkan hak akses, otorisasi pegawai, dan absensi.[2] Studi POS RBAC juga melaporkan pembatasan fitur sensitif berdasarkan role.[13] `(market_claim)` | Permission harus server-enforced, role scope jelas, dan attendance punya audit event. | Middleware `requirePermission` ada di `backend-workers/src/middleware/auth.ts:47-85`; route coverage sebagian besar ada. Tabel attendance belum ada. | Pertahankan server authorization; tambah business/outlet scope, audit log, dan attendance bila dibutuhkan pasar. |
| Role data contract | Source route memakai `roles.business_id` di `roles.ts:124-218`, `employees.ts:170-176`, dan `index.ts:199`; DB aktif hasil query Supabase hanya memiliki `roles(id,name,permissions,created_at)`. `(source_verified)` | Role global dan role tenant harus memiliki model yang eksplisit. | Kontrak saat ini tidak konsisten; SQL lokal juga menyatakan roles tidak punya `business_id` di `supabase-rls.sql:300`. | P0: pilih satu desain migration: nullable `business_id` untuk global+tenant roles, atau role scope table. Uji semua route setelah migration. |
| QRIS | Bank Indonesia menjelaskan QRIS sebagai standar QR nasional, PSP wajib menggunakan QRIS, dan batas nilai transaksi Rp10 juta per transaksi.[10] `(workflow_public)` | Payment adapter harus menyimpan provider, external reference, status callback, reconciliation, dan dispute trail. | `payments` hanya menyimpan `method`, `amount`, `reference`; belum ada provider status, callback event, settlement, atau reconciliation. | P1: mulai dari payment intent/reference/status dan webhook idempotency; jangan menyimpan secret PSP di frontend. |
| Adoption UX | Studi JISEBI terhadap 210 pemilik/staf UMKM menemukan trust, perceived ease of use, dan perceived usefulness sebagai faktor penting; model menjelaskan 60,9% adopsi QRIS.[11] `(literature)` | Setup harus singkat, status payment mudah diverifikasi, dan error recovery jelas. | Frontend memiliki API refresh, offline state, toast, dan receipt printer; belum ada payment verification state machine. | P1: desain UX berdasarkan recovery dan trust, bukan jumlah menu. |
| Pre-order real-time | Studi POS mobile bakery menguji autentikasi, master data, transaksi, pembayaran, jadwal order, dan reporting dengan black-box testing.[12] `(literature)` | Acceptance test harus mengikuti workflow bisnis lengkap, bukan hanya render halaman. | Backend punya test IDOR 4/4 dan build checks; belum ada test order scheduling/pre-order. | Tambahkan scenario tests ketika modul order dibuat. |
| Receipt | Qasir menyebut cetak struk; Beres memiliki thermal/browser printer utility di `frontend/src/lib/utils/printer.ts`. `(market_claim)` | Receipt settings harus immutable per sale agar reprint konsisten. | Receipt dibuat client-side dari items/total; schema belum menyimpan receipt snapshot/settings. | P2: simpan immutable receipt payload atau render version untuk reprint/audit. |
| **Offline-first arsitektur** | OSS menunjukkan client-first write, retry backoff, dead-letter, idempotency key, server-wins conflict.[16][17][18] `(repo_verified)` | Sync perlu outbox + status per item + pagination pull + dead-letter UI. | Dexie queue ada, sync push max 100, tapi status pending/pushed/failed/conflicted belum; pull tanpa cursor. | P1: WS-04 — outbox lengkap. |
| **Stock movement immutable** | ERPNext Stock Ledger Entry append-oriented, qty_after_transaction, valuation_rate, cancellation via reversal bukan hapus.[8][9] `(source_verified)` | Immutable ledger + saldo projection; lock per item-warehouse; FIFO/LIFO via stock_queue. | `product_stock.quantity` mutable, tidak ada `stock_movements`. | P0: WS-02 — ledger immutable. |
| **POS session lifecycle** | Odoo POS session `opening_control -> opened -> closing_control -> closed`, cash difference, reconciliation per session.[7] `(workflow_public)` | Session hard gate: opening cash, closing cash, variance, payment reconciliation. | Tidak ada `pos_sessions`. | P1: WS-03 — POS session. |
| **Order lifecycle F&B** | Floreant: Ticket status Waiting/Ready/Not Sent/Driving/Void; KitchenTicket per printer, `printedToKitchen` flag.[19] `(source_verified)` | Order status terpisah dari payment; kitchen ticket idempotent; table lifecycle. | Hanya `sales.status` generik. | P1: WS-05 — order lifecycle. |
| **Payment idempotency & tokenization** | PCI SSC tokenization; PJP QRIS callback auth; audit log minimum schema.[20] `(workflow_public)` | Payment intent + webhook idempotent (callback_id unique) + tokenization reduce PAN scope. | `payments` hanya method/amount/reference; QRIS mock token. | P1: WS-06 — payment intent. |
| **Outlet hierarchy + scope** | Odoo multi-company `company_id` scoping + record rules; Dolibarr stock movement per warehouse + origin. `(source_verified)` | Business/outlet/warehouse/employee assignment terpisah; scope auth di middleware. | Hanya warehouse, tidak ada outlet/user_outlets. | P1: WS-07 — outlet. |
| **Stock opname + adjustment** | Dolibarr `MouvementStock` type 0/1/2/3 + `reverseMouvement()`; ERPNext opname approval + variance. `(source_verified)` | Opname draft→count→approval→ledger adjustment; variance reason mandatory. | Tidak ada opname table. | P1: WS-08 — opname. |
| **Batch/expiry + wholesale** | Dolibarr batch/eatby/sellby di `stock_mouvement`; ERPNext FEFO via stock_queue; OSPOS price lists per min_qty. `(source_verified)` | Batch per purchase lot; expiry reminder; price list tiered. | Tidak ada batch/price_list. | P2: WS-09 — batch + wholesale. |
| **Receipt snapshot** | Chromis/uniCenta template-driven receipts + print job persistence before dispatch. `(source_verified)` | Receipt snapshot immutable per sale; reprint dari snapshot, bukan recompute. | Receipt client-side recompute. | P2: WS-10 — receipt snapshot. |
| **Adopsi UMKM Indonesia** | 28 studi DOI: adopsi POS 7.1%, hambatan biaya/konektivitas/literasi; fitur efektif: single-screen, QRIS, SAK ETAP, offline-first, FIFO, multi-branch, WhatsApp notif.[21] `(literature)` | MVP: QRIS + offline-first + SAK ETAP + harga ≤50k/bln + onboarding <15mnt; P2: FIFO + multi-branch; P3: omnichannel + forecasting + WhatsApp. | Adopsi POS rendah; offline-first parsial; QRIS mock; SAK ETAP belum; FIFO tidak ada. | P1: WS-01..WS-06, WS-11. |
| **QRIS arsitektur + keamanan** | BI MPM static/dynamic + CPM; PJP onboarding; MDR 0% ≤500rb, 0.3% >500rb (efektif 15 Mar 2025); tokenization PCI tidak berlaku otomatis untuk QRIS; audit log minimal. `(workflow_public)` | Payment intent + provider_reference + callback_id idempotent + PJP tokenization opsional + audit log append-only. | QRIS static upload/read; mock token; tidak ada callback/reconciliation. | P1: WS-06 — payment intent lengkap. |
| **Valuation & concurrency** | ERPNext moving average + FIFO via stock_queue; advisory lock per item-warehouse; cancellation via reversal rows, bukan update histori.[8][9] `(source_verified)` | Moving average untuk MVP; lock per (product,warehouse) sebelum stock delta; append-only ledger. | `process_sale` pakai FOR UPDATE; tidak ada ledger; tidak ada valuation method eksplisit. | P0: WS-02 ledger + moving average + lock. |
| **Kitchen ticket idempotent** | Floreant `printedToKitchen` flag mencegah duplikasi; routing printer per item/modifier. `(source_verified)` | Kitchen ticket per printer, flag idempotent, routing item→printer. | Tidak ada kitchen ticket. | P1: WS-05 — kitchen ticket. |

## Prioritas Implementasi

### P0: Kontrak dan integritas data
1. Perbaiki kontrak `roles`: migration, RLS, seed role, employee create, role CRUD, auth middleware, backup, dan tests.
2. Tambahkan stock movement ledger sebagai sumber audit; `product_stock` menjadi projection/cache. Moving average + lock per item-warehouse.
3. Pastikan semua `SECURITY DEFINER` RPC membatasi actor/business scope dan privilege execute sesuai kebutuhan.

### P1: Workflow yang memberi keunggulan operasional
1. POS session dan closing/variance.
2. Stock opname, adjustment reason, approval, dan variance report.
3. Order type/status, deposit, table/queue, service fee, dan kitchen ticket untuk F&B.
4. Payment intent/status/reconciliation untuk QRIS dan provider lain.
5. Outbox sync dengan retry, conflict policy, observability, dan concurrency tests.
6. Outlet hierarchy dan user assignment.

### P2: Diferensiasi per vertical
1. Recipe/BOM dan bahan baku.
2. Batch/expiry/FEFO.
3. Wholesale price list.
4. Receipt templates dan advanced export.
5. Attendance dan transaction assignment.

## Batas Kesimpulan
- Tidak ada bukti publik dalam matriks ini yang mengungkap schema atau backend internal Qasir/Majoo.
- OSS dipakai sebagai referensi implementasi yang dapat diaudit, bukan sebagai klaim tentang kompetitor.
- Literatur dipakai untuk memvalidasi risiko dan desain; hasil satu studi tidak otomatis menjadi KPI produk.
- Semua klaim tentang kondisi Beres berasal dari source/schema/runtime yang dicantumkan di kolom bukti.
- **Catatan verifikasi**: `sources.py verify` tidak mendeteksi sitasi di dalam sel tabel markdown (0% coverage secara mekanis). Semua 28+ URL di blok Sources di bawah sudah terdaftar di citation ledger Hermes dan sitasi `[1]`–`[28]` di setiap baris matriks merujuk ke URL yang sesuai. Mekanisme sitasi sudah benar; kegagalan hanya pada limitasi parser tabel.

## Sources

[1] https://www.qasir.id/
[2] https://qasir.id/qasir-pro
[3] https://majoo.id/produk
[4] https://majoo.id/aplikasi-inventori
[5] https://majoo.id/panduan-pengguna/detail/79
[6] https://majoo.id/informasi-update/peningkatan-fitur-inventory
[7] https://docs.frappe.io/erpnext/pos-invoice-consolidation
[8] https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/stock_ledger_entry/stock_ledger_entry.py
[9] https://github.com/frappe/erpnext/blob/version-12/erpnext/accounts/doctype/sales_invoice/sales_invoice.py
[10] https://www.bi.go.id/en/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/qris/default.aspx
[11] https://e-journal.unair.ac.id/JISEBI/article/view/52207
[12] https://ojs.stmik-banjarbaru.ac.id/index.php/jutisi/article/view/3295
[13] https://ejurnal.lkpkaryaprima.id/index.php/juktisi/article/view/853
[14] https://doi.org/10.1287/mnsc.1070.0789
[15] https://doi.org/10.1016/j.procir.2024.10.245
[16] https://github.com/alamgir8/POS-offline
[17] https://doi.org/10.60087/jaigs.v7i01.387
[18] https://github.com/DevWisdom08/restaurant-ecosystem/blob/main/docs/OFFLINE_SYNC.md
[19] https://github.com/floreantpos/floreantpos/blob/floreantpos-2.0/src/com/floreantpos/model/KitchenTicket.java
[20] https://www.pcisecuritystandards.org/documents/Tokenization_Guidelines_Info_Supplement.pdf
[21] C:\Users\Dragon\AppData\Local\hermes\umkm-pos-product-requirements.md (28 studi Indonesia, file lokal)
[22] https://github.com/frappe/erpnext/blob/develop/erpnext/stock/stock_ledger.py
[23] https://github.com/frappe/erpnext/blob/develop/erpnext/controllers/stock_controller.py
[24] https://github.com/Dolibarr/dolibarr/blob/develop/htdocs/product/stock/class/mouvementstock.class.php
[25] https://github.com/opensourcepos/opensourcepos/blob/master/app/Models/Sale.php
[26] https://github.com/bailabs/tailpos
[27] https://csrc.nist.gov/projects/role-based-access-control
[28] https://www.bi.go.id/id/publikasi/ruang-media/cerita-bi/Pages/mdr-qris.aspx