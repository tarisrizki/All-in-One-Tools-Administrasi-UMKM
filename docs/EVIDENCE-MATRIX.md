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
| POS dasar | Qasir menyebut pencatatan transaksi, produk, stok, struk, pembayaran, dan laporan.[1] | POS perlu memisahkan capture transaksi, payment, dan receipt. | `sales`, `sale_items`, `payments`, RPC `process_sale` di `supabase-rls.sql:125-158,315-440`; route sales di `backend-workers/src/modules/sales.ts`. | Pertahankan transaksi atomik; tambah status lifecycle dan reversal yang eksplisit sebelum fitur order kompleks. |
| POS session/sub-ledger | ERPNext memisahkan invoice POS dari stock/accounting ledger sampai closing session, lalu mengonsolidasikan posting.[7] | Session register mengurangi beban ledger dan memberi rekonsiliasi kas harian. | Beres belum punya `pos_sessions`, closing voucher, register opening/closing, atau cash variance di schema. | P1: desain session kasir sebelum multi-outlet dan laporan kasir. |
| Inventory ledger | ERPNext menyimpan Stock Ledger Entry, memvalidasi negative stock, batch/serial, backdated transaction, dan menolak pembatalan entry langsung.[8] | Saldo stok adalah projection dari movement ledger; reversal dilakukan lewat dokumen sumber, bukan edit saldo. | Beres memakai mutable `product_stock.quantity` di `supabase-rls.sql:93-100`; sale mengurangi saldo di RPC `:368-394`, purchase menambahnya di `:471-483`. Tidak ada `stock_movements`. | P0/P1: tambahkan immutable movement ledger, source document, reversal, warehouse, quantity delta, cost, dan audit actor. |
| Stock accuracy | Studi DeHoratius/Raman menemukan 65% dari hampir 370.000 record inventory tidak akurat dan menunjukkan audit inventory sebagai faktor mitigasi.[14] | Opname dan exception report harus menjadi workflow inti, bukan fitur kosmetik. | Ada saldo dan laporan inventory, tetapi belum ada tabel opname, approval, variance reason, atau adjustment ledger. | P1: implement stock opname sebagai adjustment terdokumentasi; ukur record accuracy dan shrinkage. |
| Offline sync | Paper offline synchronization menekankan metrik kualitas sync dan tidak ada satu pendekatan yang unggul untuk semua skenario.[15] | Sync perlu contract untuk ordering, retry, conflict, observability, dan chunking. | Frontend Dexie menyimpan pending transaction dan pull data di `frontend/src/lib/db.ts:40-79` serta `frontend/src/lib/stores/sync.svelte.ts:65-128`; backend membatasi batch 100 di `sync.ts:19-30`. | P1: tambahkan outbox state, retry count, per-item result, dead-letter/manual retry, dan metrics. |
| Idempotency | POS offline open source mendokumentasikan idempotent event processing, versioning, dan conflict handling.[16] | Client transaction ID harus UNIQUE di DB dan diproses oleh RPC atomik. | `sales.client_transaction_id UNIQUE` di schema `:125-131`; `process_sale` melakukan duplicate check dan lock stock `:345-394`; sync memanggil RPC `sync.ts:200-241`. | Pola saat ini benar secara dasar; tambahkan test concurrency dan jangan menambah jalur manual kedua. |
| Order/pre-order | Qasir mencantumkan tipe order, biaya layanan, status order, tiket pesanan, meja, uang muka, dan nomor antrian.[2] | Order lifecycle harus terpisah dari payment settlement dan fulfillment/kitchen state. | Schema sales hanya punya `status` generik; belum ada order type, service fee, deposit, table, queue, atau kitchen ticket. | P1 untuk F&B: model order lifecycle terpisah, jangan menjejalkan semua state ke `sales.status`. |
| Produk dan inventory lanjutan | Qasir mencantumkan bulk product operations, bahan baku, harga modal, harga grosir, expiry reminder, dan stock turnover.[2] | Product master perlu recipe/BOM, price lists, batch/expiry, dan adjustment/report projections. | Products memiliki cost/sell price, SKU/barcode, unit, stock, min stock; belum ada recipe, purchase lots, expiry, wholesale price, atau turnover query. | P1/P2 berdasarkan vertical; mulai dari stock movement dan cost basis, lalu recipe/expiry. |
| Multi-outlet | Qasir mencantumkan outlet utama dan cabang; halaman Majoo memisahkan modul owner, inventory, analytics, dan employee.[2][3] | Business, outlet, warehouse, employee assignment, dan permission scope harus berbeda. | Beres punya `businesses`, `warehouses`, users dengan `business_id`; belum punya outlet hierarchy atau user-to-outlet assignment. | P1: bedakan warehouse dari outlet dan tambahkan scope authorization. |
| Employee/RBAC | Qasir mencantumkan hak akses, otorisasi pegawai, dan absensi.[2] Studi POS RBAC juga melaporkan pembatasan fitur sensitif berdasarkan role.[13] | Permission harus server-enforced, role scope jelas, dan attendance punya audit event. | Middleware `requirePermission` ada di `backend-workers/src/middleware/auth.ts:47-85`; route coverage sebagian besar ada. Tabel attendance belum ada. | Pertahankan server authorization; tambah business/outlet scope, audit log, dan attendance bila dibutuhkan pasar. |
| Role data contract | Source route memakai `roles.business_id` di `roles.ts:124-218`, `employees.ts:170-176`, dan `index.ts:199`; DB aktif hasil query Supabase hanya memiliki `roles.id,name,permissions,created_at`. | Role global dan role tenant harus memiliki model yang eksplisit. | Kontrak saat ini tidak konsisten; SQL lokal juga menyatakan roles tidak punya `business_id` di `supabase-rls.sql:300`. | P0: pilih satu desain migration: nullable `business_id` untuk global+tenant roles, atau role scope table. Uji semua route setelah migration. |
| QRIS | Bank Indonesia menjelaskan QRIS sebagai standar QR nasional, PSP wajib menggunakan QRIS, dan batas nilai transaksi Rp10 juta per transaksi.[10] | Payment adapter harus menyimpan provider, external reference, status callback, reconciliation, dan dispute trail. | `payments` hanya menyimpan `method`, `amount`, `reference`; belum ada provider status, callback event, settlement, atau reconciliation. | P1: mulai dari payment intent/reference/status dan webhook idempotency; jangan menyimpan secret PSP di frontend. |
| Adoption UX | Studi JISEBI terhadap 210 pemilik/staf UMKM menemukan trust, perceived ease of use, dan perceived usefulness sebagai faktor penting; model menjelaskan 60,9% adopsi QRIS.[13] | Setup harus singkat, status payment mudah diverifikasi, dan error recovery jelas. | Frontend memiliki API refresh, offline state, toast, dan receipt printer; belum ada payment verification state machine. | P1: desain UX berdasarkan recovery dan trust, bukan jumlah menu. |
| Pre-order real-time | Studi POS mobile bakery menguji autentikasi, master data, transaksi, pembayaran, jadwal order, dan reporting dengan black-box testing.[12] | Acceptance test harus mengikuti workflow bisnis lengkap, bukan hanya render halaman. | Backend punya test IDOR 4/4 dan build checks; belum ada test order scheduling/pre-order. | Tambahkan scenario tests ketika modul order dibuat. |
| Receipt | Qasir menyebut cetak struk; Beres memiliki thermal/browser printer utility di `frontend/src/lib/utils/printer.ts`. | Receipt settings harus immutable per sale agar reprint konsisten. | Receipt dibuat client-side dari items/total; schema belum menyimpan receipt snapshot/settings. | P2: simpan immutable receipt payload atau render version untuk reprint/audit. |

## Prioritas Implementasi

### P0: Kontrak dan integritas data

1. Perbaiki kontrak `roles`: migration, RLS, seed role, employee create, role CRUD, auth middleware, backup, dan tests.
2. Tambahkan stock movement ledger sebagai sumber audit; `product_stock` menjadi projection/cache.
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

## Sources

[1] https://raw.githubusercontent.com/ChromisPos/ChromisPOS/master/src-pos/uk/chromis/pos/ticket/TicketInfo.java
[2] https://raw.githubusercontent.com/ChromisPos/ChromisPOS/master/src-pos/uk/chromis/pos/ticket/TaxInfo.java
[3] https://raw.githubusercontent.com/ChromisPos/ChromisPOS/master/src-pos/uk/chromis/pos/printer/printer/DevicePrinterPrinter.java
[7] https://sourceforge.net/projects/unicentaopos
