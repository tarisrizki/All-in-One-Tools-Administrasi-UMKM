# Research Artifact — Beres UMKM (12 Jalur OSS + Jurnal + BI)

Tanggal: 2026-08-09

## 1. ERPNext POS + Stock/Accounting (source_verified)

**Sumber**: ERPNext `develop` (sales_invoice.py, pos_invoice.py, payment_entry.py, stock_ledger.py, docs.frappe.io)

**Pola kunci**:
- `SalesInvoice` sebagai dokumen transaksi; `POSInvoice` inherit → validasi, GL, stock, cancel terpusat
- `on_submit()`: validate → stock ledger (bila `update_stock=1`) → GL entries (piutang/pendapatan/pajak/COGS) → update outstanding
- Stock Ledger Entry: `item_code`, `warehouse`, `actual_qty`, `qty_after_transaction`, `valuation_rate`, `stock_value`, `voucher_type`, `voucher_no`, `is_cancelled`
- Advisory lock per item-warehouse untuk serialisasi stok konkuren
- Cancellation: `set_as_cancel()` update SLE `is_cancelled=1` + buat reversal entries
- Idempotency: Payment Entry pakai composite key `(reference_doctype, reference_name, payment_term, payment_request)`
- Valuation: Moving Average default; FIFO via `stock_queue` serialized; repost valuation untuk backdated/bulk
- Multi-company: `company_id` scoping eksplisit di semua dokumen

**Implikasi Beres**: WS-02 (stock_movements ledger immutable), WS-03 (POS session), WS-05 (order lifecycle), WS-11 (lock per product+warehouse)

---

## 2. Odoo Community POS + Stock/Accounting (source_verified)

**Sumber**: Odoo 18 `addons/point_of_sale/models/pos_order.py`, `addons/stock/models/stock_move.py`, `addons/account/models/account_move.py`, docs

**Pola kunci**:
- `pos.order` = hub: `session_id`, `company_id`, `payment_ids`, `picking_ids`, `account_move`, state transitions
- POS session lifecycle: `opening_control -> opened -> closing_control -> closed` — hard gate, cash difference handling
- Payments: record terpisah dengan UUID uniqueness, payment-method validation vs session config
- Stock: `stock.picking` / `stock.move` dari POS order lines; lot/serial support; end-of-session picking creation
- Taxes: `account.tax.compute_all` + tax-details pipeline (bukan ad hoc line math)
- Accounting: posting payment, cash difference, invoice receivable, stock output → reconcile di session close
- Multi-company: `company_id` scoping eksplisit, `with_company(...)`
- Access control: app groups + record rules (tidak hanya frontend)

**Implikasi Beres**: WS-03 (POS session lifecycle), WS-07 (outlet hierarchy = company scoping), WS-06 (payment idempotent)

---

## 3. Dolibarr ERP/POS (source_verified)

**Sumber**: `htdocs/product/stock/class/mouvementstock.class.php`, `htdocs/comm/action/`, docs

**Pola kunci**:
- `MouvementStock` class → tabel `stock_mouvement`
- Field: `datem`, `fk_product`, `fk_entrepot`, `value` (delta), `price`, `type_mouvement` (0/1/2/3), `fk_user_author`, `label`, `inventorycode`, `fk_origin`, `origintype`, `batch`, `eatby`, `sellby`
- `_create()`: transaksi DB (begin/commit/rollback)
- `reception()` tambah stok, `livraison()` kurangi stok
- `reverseMouvement()` untuk koreksi historis (bukan hapus-tulis ulang)
- Purchase/Sales order → receipt/shipment (memengaruhi stok)
- Pricing: weighted average cost, simpan biaya aktual per movement

**Implikasi Beres**: WS-02 (stock_movements schema), WS-08 (opname + adjustment), WS-09 (batch/expiry)

---

## 4. ERPNext/Frappe Stock Ledger Deep Dive (source_verified)

**Sumber**: `erpnext/stock/stock_ledger.py`, `erpnext/controllers/stock_controller.py`

**Pola kunci**:
- Stock ledger append-oriented TAPI `is_cancelled` di-update di row asli (mutation), lalu reversal rows
- `qty_after_transaction`, `valuation_rate`, `stock_value_difference`, `stock_queue` (FIFO/LIFO serialized)
- `make_sl_entries()` per `(item_code, warehouse)`; advisory lock untuk serialisasi
- Moving Average default; FIFO via `stock_queue`; repost valuation untuk urutan/backdated
- Concurrent sale → lock `(product, warehouse)` sebelum validasi + pengurangan
- Return/reversal dokumen eksplisit (bukan hapus ledger)

**Keputusan desain Beres**: MVP pakai Moving Average + append-only ledger + lock per item-warehouse; FIFO ditunda setelah tes repost lolos.

**Implikasi Beres**: WS-02, WS-11

---

## 5. Chromis POS / uniCenta oPOS (source_verified)

**Sumber**: Chromis `TicketInfo.java`, `TaxInfo.java`, `DevicePrinterPrinter.java`; uniCenta features/docs

**Pola kunci**:
- Receipt pipeline: `beginReceipt()` → line/image/barcode → `endReceipt()` → `DevicePrinterPrinter` resolve printer → `PrintableBasicTicket` render → `PrintException` log → clear ticket
- Template-driven receipts: customizable header/footer, receipt-number padding/prefix, pickup numbers, print-on/off, multiple printers, remote/kitchen printing
- Cash register sessions: `Session` open/close, opening/closing cash, cash difference, Z-report
- Table management: table state (free/occupied/bill requested), order per table
- Kitchen tickets: printer routing per item/modifier
- Offline: H2 embedded DB, sync ke server saat online

**Implikasi Beres**: WS-10 (receipt snapshot + template), WS-03 (POS session), WS-05 (table/kitchen)

---

## 6. Floreant POS (source_verified)

**Sumber**: `floreantpos/floreantpos` branch `floreantpos-2.0` commit `6cf73ad` (Ticket.java, OrderController.java, KitchenTicket.java)

**Pola kunci**:
- `Ticket`: table number, status `Waiting/Ready/Not Sent/Driving/Void`
- `OrderController.saveOrder()` mark table occupied; `Ticket.setClosed(true)` release table
- `KitchenTicket.fromTicket()` → ticket per printer dengan table number, server, order type, sequence, item, modifier, cooking instruction
- `printedToKitchen` flag per item → idempotent kitchen ticket (mencegah duplikasi)
- Split/merge payment di `Ticket`: multiple `Payment` records, `Tender` type, change
- Modifiers: `Modifier` group → pilihan per item

**Implikasi Beres**: WS-05 (order lifecycle + kitchen ticket idempotent), WS-10 (receipt snapshot)

---

## 7. Open Source POS (OSPOS) (source_verified)

**Sumber**: `opensourcepos/opensourcepos` master (Sale.php, initial_schema.sql, migrations)

**Pola kunci**:
- Sales normalized: `sales`, `sales_items`, `sales_items_taxes`, `sales_payments`, `sales_taxes` — line-item tax detail + payment split
- Customer/loyalty: `customers.points`, `customers_packages`, `customers_points`, `sales_reward_points` — reward accrual/redemption di `Sale.php`
- Taxes/discounts first-class: item discounts per line, tax detail per sale & per item, tax codes/categories/jurisdictions
- Inventory adjustments: `inventory` + `item_quantities`; sale complete/delete → compensating stock movements
- Permissions: role-based di model layer, bukan hanya route

**Implikasi Beres**: WS-02 (stock adjustments), WS-06 (payment split), WS-07 (scope auth), WS-11 (permissions)

---

## 8. Offline-First POS Sync (source_verified)

**Sumber**: TailPOS, restaurant-ecosystem PouchDB→CouchDB, POS-Inventory-Management-System (Flutter+SQLite+Firebase)

**Pola kunci**:
- Client-first write: local order → `_synced`, `_retry_count`, `_last_sync_attempt`, `_offline`
- Sync: `live: true, retry: true`; failed 3x → manual review
- Conflict: server-wins untuk field kritis, status progression merge, conflict audit
- Idempotency: `sale_id` PK = duplicate prevention; `_original_order_id` dikirim tapi server uniqueness tidak ditunjukkan
- Weakness: replace temp local doc dengan server-ID lalu delete temp = risky under retries

**Implikasi Beres**: WS-04 (outbox lengkap: status per item, retry backoff, dead-letter, pagination pull, conflict UI)

---

## 9. Literature: Inventory Management SME (literature)

**Sumber**: 4 paper peer-reviewed (DeHoratius & Raman 2008, Chuang & Oliva 2015, DeHoratius et al. 2019, Rumyantsev & Netessine 2007)

**Temuan kunci**:
- 65% record inventory tidak akurat (370k record, 37 toko) — auditing mengurangi inaccuracy
- Shrinkage backroom & shelf major driver; full-time labor mengurangi inaccuracy
- Targeted counting (high-activity, low-recorded-stock) 2-8x lebih efektif vs random
- Inaccuracy berhubungan langsung dengan stockout, overstock, lost sales

**Implikasi Beres**: WS-02 (ledger + audit trail), WS-08 (opname targeted), WS-11 (accuracy KPI)

---

## 10. Adopsi POS/Akuntansi Digital UMKM Indonesia (literature)

**Sumber**: 28 studi DOI-terotentikasi 2020-2026 (Affandi 2024, Nababan 2026, SLR Atlantis-Press 2024, Suhendi 2026, Cogent Business, Sustainability, JNTETI, JOINS, Jutisi, JAEMB, ECOTAL, dll.)

**Temuan kunci**:
- Adopsi POS hanya **7.1%** (terendah dari 5 proses digital)
- 3 hambatan struktural: **Biaya tinggi** (terulang), **Konektivitas tidak merata** (17 provinsi), **Literasi digital rendah** (pelatihan terpisah)
- Fitur efektif (bukti kuantitatif): Single-screen checkout (-70% waktu), SAK ETAP compliant (akses kredit), FIFO perpetual (selisih stok antar cabang), QRIS (kepercayaan), Forecasting least-square
- Persyaratan produk P1: **Offline-first**, **QRIS wajib**, **Harga ≤50k/bln**, **SAK ETAP reporting**, **Single-screen**, **Onboarding <15mnt + video Bahasa Indonesia**
- P2: FIFO/FEFO + alert, Multi-branch tanpa biaya tambahan, Multi-user RBAC, Android compatibility
- P3: Omnichannel, Forecasting, WhatsApp notif, OCR kwitansi, Export CSV/Excel no lock-in

**Implikasi Beres**: Seluruh WS-01..WS-11 + pricing/UX (bukan coder task)

---

## 11. QRIS Arsitektur + Keamanan Pembayaran (source_verified + literature)

**Sumber**: BI resmi (bi.go.id), PCI SSC Tokenization Guidelines, NIST RBAC/SP 800-92/800-63A, Rafferty & Fajar 2022 (APJIS), Sai 2017

**Temuan kunci**:
- QRIS: MPM static/dynamic + CPM; PJP onboarding; Merchant ID + QR code
- Static MPM mikro/kecil: customer input amount; Dynamic MPM: merchant generate amount; CPM: high-speed
- Verification: BI-licensed PJP, verify merchant name, confirm notification
- MDR (efektif 15 Mar 2025): 0% UMI ≤500rb, 0.3% >500rb
- Tokenization PCI: surrogate token reduce PAN scope; TIDAK otomatis hapus PCI DSS scope; token vault/key management perlu
- Role separation: Cashier/Supervisor/Owner/Finance/Support — high-risk actions butuh second auth
- Audit log minimum: `event_id`, UTC timestamp, actor ID+role, outlet/device, action, target, before/after, amount, provider ref, result, failure reason, correlation ID — NO PAN/CVV/PIN/tokens
- Fraud rules SME: repeated voids, refund tanpa sale, high refund ratio, discount abnormal, duplicate payment, outside hours, rapid login failures, new device, settlement mismatch

**Unverified**: QRIS ≠ PCI tokenization; PJP license/API/callback/retry/reversal/SLA belum diverifikasi; BI spec lengkap belum diambil

**Implikasi Beres**: WS-06 (payment intent + webhook idempotent + audit log), WS-11 (role separation + fraud rules)

---

## 12. Reverse-Spec Beres (repo_verified)

**Sumber**: Audit `C:\Users\Dragon\umkm-audit` read-only (index.ts, modules, schema, RLS, RPC, frontend routes, Dexie, sync)

**Gap critical**:
- Schema vs backend mismatch: `supabase-rls.sql` kurang `min_stock`/`description` (products), `purchase_orders` kolom beda (`invoice_number` vs `po_number`), `purchase_order_items` `price` vs `cost_price`
- RLS policy loop: `product_stock`, `sale_items`, `payments`, `purchase_order_items`, `debt_payments` tidak punya `business_id` tapi policy loop asumsinya; `roles` tidak punya `business_id` tapi backend filter; `users` policy pakai `user_id` yg tidak ada
- SQL policy loop: `DROP POLICY ... ON %I` bukan dynamic SQL → gagal
- Debt payment non-atomic: read/check/insert/update tanpa lock/RPC; atomic `pay_debt()` ada di SQL tapi tidak dipakai
- Backup UI: frontend call `/backup/*` tidak ada di gateway (hanya scheduled di index.ts)
- Marketplace integration: frontend call `/sync/marketplace/pull/tokopedia` tidak ada backend
- Report export: 501 unimplemented, tapi frontend masih call
- Qasir POS features claimed: tidak ada `tax_percent`, `order_type`, `service_charge`, `table`, `queue_number`, `down_payment`, pre-order di SQL/backend/frontend; POS hardcode `tax: 0`
- Inventory claimed: tidak ada bulk import/export, raw materials, wholesale prices, expiry, stock movement
- Multi-outlet claimed: hanya warehouse, tidak ada outlet/branch model
- Attendance claimed: tidak ada table/route/field
- QRIS: static upload/read OK, `/sales/qris-token` return mock token
- WhatsApp reminder: simulasi tanpa external call
- Cash-flow report: query kolom `entry_date`/`payment_date` yg tidak ada (hanya `created_at`)
- Offline queue contract mismatch: Dexie `quantity`/`unitPrice` vs sync API `productId`/`qty`/`price`
- Online POS always queue locally first (Dexie → background sync)
- Product search: search interpolasi mentah ke `.or()` → injection gap

**Implemented**: Core POS sales/payments/stock/idempotency/loyalty; product CRUD/warehouse/barcode; customers/suppliers/purchases/cashbook/debts/reports/employees/roles/static QRIS/receipt/Dexie sync; atomic purchase receive; atomic debt RPC (tapi bypassed)

**Implikasi Beres**: Validasi seluruh WS-01..WS-11; WS-01 (roles), WS-02 (ledger), WS-03 (session), WS-04 (sync), WS-05 (order), WS-06 (payment), WS-07 (outlet), WS-08 (opname), WS-09 (batch/wholesale), WS-10 (receipt), WS-11 (hardening)

---

## Konsolidasi ke Evidence Matrix

Semua 29 area sudah dimasukkan ke `docs/EVIDENCE-MATRIX.md` dengan level bukti yang benar (`market_claim`/`workflow_public`/`source_verified`/`literature`/`repo_verified`) dan keputusan prioritas P0/P1/P2.

## File Artifacts

| File | Deskripsi |
|---|---|
| `docs/EVIDENCE-MATRIX.md` | 29 area × 5 level bukti + 28+ sources |
| `docs/BERES_REVERSE_SPEC.md` | Reverse spec dengan EARS, acceptance criteria, P0-P3 |
| `task.md` | 12 workstream checklist + status |
| `C:\Users\Dragon\AppData\Local\hermes\umkm-pos-product-requirements.md` | 28 studi Indonesia → persyaratan produk P1/P2/P3 |
| `supabase/migrations/ws-*.sql` | Migration per workstream (anti-konflik) |

---

## Next Step

Menunggu 12 subagen implementasi (deleg_ab57654e) selesai → review hasil → regresi penuh → merge migration → commit → centang task.md.