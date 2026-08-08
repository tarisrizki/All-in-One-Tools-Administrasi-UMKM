# Pre-Launch Integration Checklist

> **Panduan:** Jalankan setiap test case secara berurutan sebelum deployment ke production. Tandai ✅ saat pass, ❌ saat fail. Jika fail, catat error log dan langkah reproduksi.

---

## 1. Register & Login Flow

### TC-001: Registrasi Akun Baru

| Field | Value |
|-------|-------|
| **Precondition** | Database clean / email belum terdaftar |
| **Steps** | 1. Buka halaman register<br>2. Isi: nama lengkap, email unik, password min. 8 karakter<br>3. Klik "Daftar"<br>4. Verifikasi email (buka link di inbox)<br>5. Login dengan kredensial baru |
| **Expected** | Akun aktif, user masuk ke dashboard |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-002: Login dengan Kredensial Benar

| Field | Value |
|-------|-------|
| **Precondition** | Akun sudah terverifikasi |
| **Steps** | 1. Buka halaman login<br>2. Masukkan email + password yang benar<br>3. Klik "Masuk" |
| **Expected** | Berhasil login, redirect ke dashboard, token tersimpan di localStorage/cookie |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-003: Login dengan Password Salah

| Field | Value |
|-------|-------|
| **Precondition** | Akun sudah ada |
| **Steps** | 1. Buka halaman login<br>2. Masukkan email benar + password salah<br>3. Klik "Masuk" |
| **Expected** | Error "Password salah" / "Kredensial tidak valid", tidak masuk dashboard |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-004: Login dengan Email Tidak Terdaftar

| Field | Value |
|-------|-------|
| **Precondition** | Email belum pernah registrasi |
| **Steps** | 1. Buka halaman login<br>2. Masukkan email acak yang tidak ada<br>3. Klik "Masuk" |
| **Expected** | Error "Akun tidak ditemukan", tidak ada informasi email valid/invalid |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

## 2. Refresh Token Setelah 8 Jam

### TC-005: Token Auto-Refresh (Simulasi 8 Jam)

| Field | Value |
|-------|-------|
| **Precondition** | User sudah login |
| **Setup** | Gunakan dev tools / intercept proxy untuk manipulasi waktu cookie/token expiry |
| **Steps** | 1. Login normal<br>2. Set waktu browser/cookie expiry ke T+8 jam<br>3. Lakukan request API (misal: fetch data kasir)<br>4. Periksa header response atau localStorage |
| **Expected** | - Request tetap berhasil<br>- Token di-refresh otomatis (access token baru)<br>- Refresh token di-update jika sudah di-rotasi<br>- Tidak ada prompt login ulang |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-006: Token Refresh dengan Refresh Token Expired

| Field | Value |
|-------|-------|
| **Precondition** | User sudah login, refresh token sudah expired (simulasi) |
| **Setup** | Set cookie `refresh_token` ke sudah expired, atau modifikasi expiry di DB |
| **Steps** | 1. Login<br>2. Set refresh token expired<br>3. Trigger request API yang butuh token |
| **Expected** | - Request ditolak (401 Unauthorized)<br>- User di-redirect ke halaman login<br>- Tidak ada token yang di-generate tanpa refresh token valid |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

## 3. Offline Transaction → Sync

### TC-007: Transaksi Offline Disimpan Lokal

| Field | Value |
|-------|-------|
| **Precondition** | User login, modal "Offline Mode" aktif / flag `isOnline = false` |
| **Setup** | Matikan koneksi internet / gunakan Network tab di DevTools → Offline |
| **Steps** | 1. Buat transaksi POS baru (misal: jual barang, qty 2, harga 50.000)<br>2. Lihat IndexedDB / localStorage / state<br>3. Cek UI apakah ada indikator "Tersimpan offline" |
| **Expected** | Transaksi tersimpan di local storage dengan status `pending_sync: true`, tidak ada request ke server |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-008: Sync Otomatis Saat Online Kembali

| Field | Value |
|-------|-------|
| **Precondition** | Ada transaksi tersimpan offline dari TC-007 |
| **Setup** | Cabut koneksi internet, buat transaksi, lalu sambungkan kembali |
| **Steps** | 1. Offline → buat 1 transaksi<br>2. Online → trigger sync (navigasi page atau manual "Sync Sekarang")<br>3. Verifikasi data di database server |
| **Expected** | - Transaksi tersimpan di server dengan `sync_timestamp`<br>- Status berubah jadi `pending_sync: false`<br>- UI mengindikasikan sync berhasil<br>- Tidak ada duplikat transaksi |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-009: Sync dengan Konflik (Data Sudah Diubah Server)

| Field | Value |
|-------|-------|
| **Precondition** | User A offline, User B online mengubah data yang sama |
| **Setup** | Manual: modifikasi record di DB sementara user offline |
| **Steps** | 1. User A buat transaksi offline (stok barang X = 10)<br>2. Admin ubah stok barang X di DB jadi 5<br>3. User A online → sync<br>4. Lihat bagaimana konflik ditangani |
| **Expected** | - Sistem mendeteksi konflik (opsional: tampilkan warning)<br>- Tidak ada inkonsistensi stok<br>- Log konflik tersimpan untuk audit |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

## 4. Idempotency: Push Transaksi Sama 2x

### TC-010: Double Push dengan Idempotency Key Sama

| Field | Value |
|-------|-------|
| **Precondition** | Koneksi stabil |
| **Setup** | Gunakan Postman / script untuk emit 2 request identik |
| **Steps** | 1. POST `/transactions` dengan idempotency key `idem-12345`<br>2. Body: `{ items: [...], total: 100000, idempotency_key: "idem-12345" }`<br>3. Request pertama → response 201 Created<br>4. Request kedua (identik) → response ??? |
| **Expected** | - Request kedua return **201** (atau 200) dengan data transaksi yang sama persis<br>- **Hanya 1 record** di tabel `transactions`<br>- Tidak ada double charge / double inventory deduction |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-011: Double Push tanpa Idempotency Key

| Field | Value |
|-------|-------|
| **Precondition** | Koneksi stabil |
| **Setup** | Klik tombol "Bayar" 2x secara cepat di UI (atau 2 request POST identik tanpa key) |
| **Steps** | 1. Buat transaksi POS<br>2. Klik "Bayar" 2x dalam < 1 detik<br>3. Periksa database / response |
| **Expected** | - Hanya 1 transaksi yang tereksekusi di database<br>- User melihat 1x notifikasi sukses<br>- Double-click tidak menyebabkan double charge |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

## 5. Race Condition: 2 Kasir Push Bersamaan

### TC-012: Concurrent Push dengan Stok Cukup

| Field | Value |
|-------|-------|
| **Precondition** | Barang A punya stok = 5 |
| **Setup** | Gunakan 2 browser/tab berbeda, login sebagai kasir berbeda |
| **Steps** | 1. Tab A: pilih barang A (qty 3), siap bayar<br>2. Tab B: pilih barang A (qty 3), siap bayar<br>3. Tab A: klik "Bayar" → langsung<br>4. Tab B: klik "Bayar" → bersamaan dengan A (± 100ms)<br>5. Periksa stok barang A di DB |
| **Expected** | - Kedua transaksi sukses<br>- Stok akhir = 5 - 3 - 3 = **-1**? → cek apakah boleh minus atau ditolak<br>- Pastikan tidak ada **lost update** (stok akhir harus 5 - 6 = -1, bukan -3) |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-013: Concurrent Push dengan Stok Pas-Pasan

| Field | Value |
|-------|-------|
| **Precondition** | Barang B punya stok = 2 |
| **Setup** | 2 tab browser, kasir berbeda |
| **Steps** | 1. Tab A: pilih barang B (qty 2)<br>2. Tab B: pilih barang B (qty 2)<br>3. Bayar bersamaan di kedua tab |
| **Expected** | - Salah satu berhasil, satu ditolak dengan error "Stok tidak cukup"<br>- Tidak ada negative stock di database<br>- Race condition tidak menyebabkan stok = 2 + 2 - 2 = 2 (lost update) |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

## 6. PO Receive Atomic

### TC-014: PO Receive Partial Quantity

| Field | Value |
|-------|-------|
| **Precondition** | PO #12345 dibuat untuk 10 unit barang X |
| **Setup** | Login sebagai warehouse staff |
| **Steps** | 1. Buka PO #12345<br>2. Klik "Terima Barang"<br>3. Input qty diterima = **7** (partial)<br>4. Submit |
| **Expected** | - PO status = "Partial Received"<br>- `received_qty` = 7, `remaining_qty` = 3<br>- Stok barang X bertambah **7 unit**<br>- Tidak ada data corrupt / state tidak konsisten |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-015: PO Receive Full Quantity

| Field | Value |
|-------|-------|
| **Precondition** | PO #12346 untuk 10 unit barang Y, belum pernah receive |
| **Setup** | Login sebagai warehouse staff |
| **Steps** | 1. Buka PO #12346<br>2. Terima 10 unit penuh<br>3. Submit |
| **Expected** | - PO status = "Received" / "Completed"<br>- `received_qty` = 10, `remaining_qty` = 0<br>- Stok barang Y bertambah **10 unit**<br>- PO tidak bisa receive lagi |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-016: PO Receive Over Quantity (Atomicity Test)

| Field | Value |
|-------|-------|
| **Precondition** | PO #12347 untuk 5 unit barang Z |
| **Setup** | Login sebagai warehouse staff |
| **Steps** | 1. Buka PO #12347<br>2. Input qty diterima = **8** (lebih dari PO)<br>3. Submit |
| **Expected** | - Transaction di-rollback (atomic)<br>- Error: "Jumlah terima tidak boleh melebihi jumlah PO"<br>- Stok barang Z **tidak berubah**<br>- PO tetap dalam status sebelumnya |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-017: PO Receive Transaction Rollback on Failure

| Field | Value |
|-------|-------|
| **Precondition** | Koneksi unstable, PO #12348 untuk 5 unit |
| **Setup** | Gunakan proxy untuk manipulasi network (throttle/drop) |
| **Steps** | 1. Submit PO receive<br>2. Matikan koneksi saat request sedang diproses<br>3. Pastikan server tidak memproses parsial |
| **Expected** | - Jika gagal di tengah: **full rollback**<br>- Tidak ada partial update (stok setengah jalan)<br>- Client menampilkan error / retry option |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

## 7. Debt Payment Over-Limit Rejection

### TC-018: Payment Kurang dari Sisa Hutang (Normal)

| Field | Value |
|-------|-------|
| **Precondition** | Pelanggan punya debt record: total hutang = Rp 500.000 |
| **Setup** | Login sebagai kasir / admin |
| **Steps** | 1. Buka halaman piutang pelanggan<br>2. Pilih bayar sebagian: Rp 200.000<br>3. Submit payment |
| **Expected** | - Payment berhasil<br>- Sisa hutang = Rp 300.000<br>- Record payment tersimpan dengan `amount = 200000` |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-019: Payment Sama Persis dengan Sisa Hutang

| Field | Value |
|-------|-------|
| **Precondition** | Pelanggan punya debt record: total hutang = Rp 500.000 |
| **Setup** | Login sebagai kasir / admin |
| **Steps** | 1. Bayar Rp 500.000 (persis sama)<br>2. Submit |
| **Expected** | - Payment berhasil<br>- Debt status = "Lunas" / `remaining = 0`<br>- Tidak ada floating point error (Rp 500.000 - Rp 500.000 ≠ Rp 0.01) |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-020: Payment Melebihi Sisa Hutang (Over-Limit)

| Field | Value |
|-------|-------|
| **Precondition** | Pelanggan punya debt record: total hutang = Rp 500.000 |
| **Setup** | Login sebagai kasir / admin |
| **Steps** | 1. Input amount = Rp 600.000 (> sisa hutang)<br>2. Submit |
| **Expected** | - Payment **ditolak**<br>- Error: "Jumlah pembayaran tidak boleh melebihi sisa hutang Rp 500.000"<br>- Tidak ada perubahan di database<br>- UI menampilkan warning |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

### TC-021: Payment Over-Limit dengan Floating Point / Desimal

| Field | Value |
|-------|-------|
| **Precondition** | Debt record: hutang = Rp 100.000,45 |
| **Setup** | Sistem menggunakan desimal untuk amount |
| **Steps** | 1. Bayar Rp 100.000,46<br>2. Submit |
| **Expected** | - Payment ditolak dengan tepat<br>- Tidak ada precision error yang allow overpayment<br>- Minor difference (0.01) ditolak juga |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Error log jika fail:**
```
```

---

## 8. Cashbook Summary vs Manual Calculation

### TC-022: Cashbook Saldo vs Penjumlahan Manual (Sehari)

| Field | Value |
|-------|-------|
| **Precondition** | Ada transaksi beberapa hari, saldo kas nominal |
| **Setup** | Catat transaksi cash di periode yang dipilih |
| **Steps** | 1. Buka halaman Cashbook<br>2. Filter: tanggal hari ini<br>3. Baca **Saldo Akhir** yang ditampilkan<br>4. Manual hitung: `Saldo Awal + Total Penerimaan - Total Pengeluaran` |
| **Expected** | - Saldo akhir di UI **SAMA PERSIS** dengan perhitungan manual<br>- Toleransi error = 0 (tidak boleh Rp 1 pun selisih) |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**Manual Calculation:**
```
Saldo Awal      : Rp _____
Total Masuk     : Rp _____
Total Keluar    : Rp _____
Saldo Kalkulasi : Rp _____
Saldo Sistem    : Rp _____
Selisih          : Rp _____
```

---

### TC-023: Cashbook Summary vs Penjumlahan Manual (Sebulan)

| Field | Value |
|-------|-------|
| **Precondition** | Ada transaksi minimal 30 hari |
| **Setup** | Gunakan data real atau seed data |
| **Steps** | 1. Buka Cashbook<br>2. Filter: periode 1 bulan<br>3. Bandingkan total di UI dengan query manual ke database:<br>`SELECT SUM(debit) - SUM(kredit) FROM cashbook WHERE ...` |
| **Expected** | - Total di UI = hasil query SQL<br>- Tidak ada transaksi yang terlewat dari summary |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

**SQL Query:**
```sql
-- Jalankan di database untuk verifikasi
SELECT 
  COUNT(*) as total_transaksi,
  COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0) as total_masuk,
  COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0) as total_keluar
FROM cashbook 
WHERE created_at BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD 23:59:59';
```

---

### TC-024: Cashbook Closing (End of Day)

| Field | Value |
|-------|-------|
| **Precondition** | Saldo hari ini = Rp X |
| **Setup** | |
| **Steps** | 1. Selesaikan semua transaksi hari ini<br>2. Klik "Tutup Kas" / "End of Day"<br>3. Sistem membuat closing record<br>4. Saldo awal hari berikutnya = saldo akhir kemarin |
| **Expected** | - Closing record tersimpan dengan timestamp<br>- Saldo awal hari baru = saldo akhir sebelumnya<br>- Tidak ada discrepan antara closing amount dan opening amount |
| **Actual** | |
| **Status** | ☐ Pass ☐ Fail |

---

## Sign-Off

| Role | Nama | Tanggal | Tanda Tangan |
|------|------|---------|--------------|
| QA Engineer | | | |
| Backend Lead | | | |
| Frontend Lead | | | |
| Product Owner | | | |

---

**Catatan Tambahan:**

```
```

---

*Generated: $(date +%Y-%m-%d) | Update log di commit history*
