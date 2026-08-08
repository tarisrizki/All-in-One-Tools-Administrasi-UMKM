# FAQ — Pertanyaan Umum

Pertanyaan yang sering diajukan tim penjualan & operasional. Jawaban dibuat konkret untuk kemudahan lookup cepat.

---

## Q0: Fitur apa saja yang tersedia di aplikasi ini?

Aplikasi mencakup 6 kelompok fitur (set fitur mengacu pada standar Qasir):

1. **Sistem Kasir POS** — kasir multi-perangkat, QRIS, cetak struk, pajak per produk, kasbon cicilan, tipe order + biaya layanan, status order, tiket pesanan, atur tampilan struk, meja, uang muka pre-order, label pembayaran, nomor antrian
2. **Inventori Produk** — kelola produk & stok, export/ubah massal, bahan baku, harga modal, harga grosir, pengingat kedaluarsa
3. **Laporan** — penjualan, periode akses, perputaran stok
4. **Kelola Outlet** — outlet utama + cabang
5. **Pegawai** — akses, otorisasi, absensi, penugasan transaksi
6. **Strategi Bisnis** — diskon, poin loyalitas pelanggan

---

## Q1: Cara reset password karyawan

**Langkah:**

1. Login sebagai **Admin / Owner** di aplikasi.
2. Buka menu **Pengaturan > Manajemen User / Karyawan**.
3. Pilih karyawan yang ingin di-reset.
4. Klik tombol **Reset Password** / **Kirim Link Reset**.
5. Karyawan akan menerima email/SMS dengan link reset password.

> **Catatan:** Jika email tidak masuk, minta karyawan cek folder **Spam**. Link reset berlaku **24 jam**. Jika lupa link sudah kadaluarsa, ulangi langkah dari awal.

---

## Q2: Cara sync data saat offline

Aplikasi mendukung mode offline. Data tetap bisa diinput meskipun tanpa koneksi internet.

**Langkah sync manual:**

1. Pastikan koneksi internet sudah aktif.
2. Buka aplikasi → sistem otomatis mendeteksi online dan mulai sync.
3. Jika perlu force sync manual: **Pengaturan > Sinkronisasi > Tekan "Sync Sekarang"**.
4. Tunggu hingga muncul notifikasi **"Sinkronisasi berhasil"**.

> **Catatan:** Data yang diinput offline akan di-queue dan otomatis ter-push saat koneksi kembali. Urutan input tetap berdasarkan **timestamp**原始 input.

---

## Q3: Cara cek saldo kas

**Langkah:**

1. Login ke aplikasi.
2. Buka menu **Keuangan** atau **Kas & Bank** (tergantung versi).
3. Pilih **Kas** atau rekening yang ingin dicek.
4. Saldo kas akan tampil di bagian atas halaman tersebut,beserta detail mutasi terakhir.

**Untuk laporan saldo kas lengkap:**

1. Buka **Laporan > Buku Kas**.
2. Filter rentang tanggal sesuai kebutuhan.
3. Laporan menampilkan saldo awal,total masuk,total keluar,dan saldo akhir.

> **Catatan:** Saldo kas **real-time** — langsung ter-update setiap ada transaksi penjualan,pembelian,atau pengeluaran yang dicatat.

---

## Q4: Cara tambah produk baru

**Langkah:**

1. Login ke aplikasi.
2. Buka menu **Produk** atau **Stok & Gudang**.
3. Klik tombol **+ Tambah Produk** / **Produk Baru**.
4. Isi field yang diperlukan:
   - **Nama produk**
   - **SKU / Kode barang** (opsional,auto-generate jika kosong)
   - **Kategori**
   - **Harga jual & harga beli**
   - **Stok awal** (jika ada)
   - **Satuan** (pcs,kg,box,dll)
5. Klik **Simpan**.

> **Catatan:** Jika ingin tambah produk secara bulk (banyak sekaligus), bisa gunakan fitur **Import Excel/CSV** di menu yang sama.

---

## Q5: Cara handle piutang pelanggan

**Catat piutang saat transaksi:**

1. Di halaman transaksi/jual, pilih pelanggan.
2. Pilih metode pembayaran **"Tempo" / "Belum Lunas"**.
3. Isi jumlah yang dibayar dan tanggal jatuh tempo.
4. Sistem otomatis mencatat sebagai **piutang**.

**Lunasi piutang:**

1. Buka menu **Piutang** / **Hutang & Piutang**.
2. Pilih pelanggan yang memiliki piutang.
3. Klik **Bayar / Lunaskan**.
4. Pilih metode pembayaran dan nominal pelunasan.
5. Sistem akan mengurangi saldo piutang dan mencatat sebagai pembayaran.

> **Catatan:** Di menu **Piutang** juga tersedia list semua piutang dengan status **Lunas / Belum Lunas** serta **usianya** (berapa hari overdue). Gunakan untuk reminder penagihan.

---

## Q6: Kenapa invoice PDF tidak muncul?

**Jawaban:**

Invoice PDF **tidak digenerate dari server** melainkan langsung **dari sisi client (browser)** saat kamu klik "Download PDF" atau "Cetak".

**Jika PDF tidak muncul:**

1. **Izinkan pop-up** di browser → beberapa browser memblokir pop-up untuk download.
2. **Pastikan browser updated** ke versi terbaru.
3. **Cek apakah ada blokir extensions** seperti AdBlock atau uBlock — nonaktifkan sementara lalu coba lagi.
4. **Gunakan browser Chrome atau Edge** — kompatibilitas terbaik.

> Jika masalah tetap terjadi, coba **Ctrl+Shift+R** (force refresh) atau buka di **incognito/private window**.

---

## Q7: Error 'PO tidak ditemukan' saat terima barang (Receiving)

**Penyebab & Solusi:**

Error ini biasanya terjadi karena salah satu kondisi berikut:

1. **PO sudah dibatalkan atau di-close** — cek status PO di menu **Purchasing > Purchase Order**. Jika statusnya "Batal" atau "Close", tidak bisa receive.

2. **PO belum disubmit / masih draft** — PO berstatus draft belum aktif di sistem. Submit/draft PO tersebut terlebih dahulu sebelum receiving.

3. **PO sudah diterima sepenuhnya (fully received)** — semua item di PO sudah diterima. Tidak ada sisa yang perlu di-receive.

4. ** Salah gudang** — Pastikan gudang yang dipilih saat receiving sesuai dengan gudang tujuan di PO.

5. **Input nomor PO salah** — cek ulang nomor PO, pastikan tidak ada typo atau spasi ekstra.

**Langkah cepat:**

1. Buka menu **Receiving / Terima Barang**.
2. Masukkan **nomor PO yang tepat**.
3. Jika tetap error → buka PO-nya langsung dari menu **Purchasing**, cek status dan detailnya.
4. Jika PO valid tapi tetap error → hubungi tim IT dengan screenshot error + nomor PO.

---

## Q8: Apa bedanya mode offline dan online?

| Aspek | Mode Offline | Mode Online |
|-------|-------------|-------------|
| **Koneksi** | Tidak butuh internet | Butuh koneksi aktif |
| **Input data** | Bisa, data tersimpan lokal | Bisa, langsung ke server |
| **Sync** | Otomatis saat koneksi kembali | Langsung real-time |
| **Akses laporan** | Data yang sudah di-cache | Semua data terbaru |
| **Invoice/PDF** | ✅ Bisa generate | ✅ Bisa generate |
| **Piutang & keuangan** | ✅ Bisa dicatat | ✅ Bisa dicatat |

> **Tips:** Beralih ke mode online dengan memastikan **WiFi/Data seluler aktif**. Ikon status di pojok aplikasi menunjukkan mode saat ini.

---

## Q9: Cara atur pajak per produk

**Langkah:**

1. Login sebagai **Admin / Owner**.
2. Buka menu **Produk** → pilih produk yang ingin diatur pajaknya.
3. Isi kolom **Pajak (%)** pada detail produk.
4. Simpan — saat transaksi, pajak produk akan otomatis dihitung dan dicantumkan di struk.

> **Catatan:** Pajak bersifat per produk (bukan global), sehingga produk bebas pajak dan ber-pajak bisa dicampur dalam satu transaksi.

---

## Q10: Cara pakai tipe order & biaya layanan

1. Buka **Pengaturan > Tipe Order**.
2. Tambah tipe order (misal: **Dine In**, **Take Away**, **Delivery**).
3. Atur **biaya layanan** per tipe order (boleh 0 jika gratis).
4. Saat transaksi di kasir, pilih tipe order — biaya layanan otomatis ditambahkan ke total.

> **Catatan:** Biaya layanan per tipe order memungkinkan restoran membedakan tarif makan di tempat vs take away.

---

## Q11: Cara buat pre-order dengan uang muka

1. Di kasir, buat transaksi seperti biasa lalu pilih status **Pre-Order**.
2. Catat **uang muka (DP)** yang diterima dari pelanggan.
3. Sistem mencatat sisa tagihan sebagai piutang; saat barang datang, pelunasan dicatat dari menu **Piutang**.

> **Catatan:** Nomor antrian pelanggan otomatis diberikan untuk pre-order agar pesanan tertib.

---

## Q12: Cara kelola harga grosir

1. Buka **Produk** → pilih produk → buka tab **Harga Grosir**.
2. Tambah tingkat harga: misal **min. 10 pcs = Rp9.000**, **min. 50 pcs = Rp8.500**.
3. Saat kasir memasukkan qty yang memenuhi syarat, harga grosir otomatis terpakai.

> **Catatan:** Harga grosir berlaku otomatis berdasarkan kuantitas, tanpa perlu pilih manual.

---

## Q13: Cara set pengingat kedaluarsa produk

1. Buka **Produk** → isi kolom **Tanggal Kedaluarsa** saat tambah/edit produk.
2. Sistem memberi notifikasi saat produk mendekati tanggal kedaluarsa.
3. Gunakan laporan **Perputaran Stok** untuk melihat produk yang mendekati kedaluarsa sekaligus.

> **Catatan:** Berlaku untuk produk dengan masa simpan (makanan/minuman, obat, kosmetik).

---

## Q14: Cara atur outlet cabang

1. Buka **Pengaturan > Outlet**.
2. Outlet pertama otomatis menjadi **outlet utama**.
3. Klik **+ Tambah Outlet** untuk membuat cabang, isi nama & alamat.
4. Pegawai bisa ditambahkan per outlet; stok dan laporan bisa difilter per outlet.

> **Catatan:** Transaksi di kasir otomatis tercatat ke outlet aktif. Laporan bisa ditampilkan per outlet atau gabungan semua outlet.

---

## Q15: Cara catat absensi pegawai

1. Buka menu **Pegawai** → pilih karyawan.
2. Gunakan fitur **Absensi** untuk mencatat kehadiran (masuk/pulang).
3. Riwayat absensi tersimpan dan bisa diexport untuk keperluan penggajian.

> **Catatan:** Otorisasi pegawai diatur di **Pengaturan > Peran & Izin** — misal kasir hanya bisa transaksi, supervisor bisa lihat laporan.
