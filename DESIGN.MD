# DESIGN.md — All-in-One Tools Administrasi UMKM

> Design system tunggal untuk Google Stitch. Lampirkan file ini ke workspace/project sebelum generate layar apa pun — semua token & aturan di bawah berlaku sebagai **hard constraint**, bukan saran, untuk setiap layar yang di-generate.

---

## 1. Ringkasan Produk

Aplikasi PWA all-in-one untuk UMKM Indonesia: kasir/POS, stok, keuangan, dan laporan dalam satu aplikasi. Pengguna utama adalah pemilik warung/toko dan kasirnya — **sering bukan orang yang mahir teknologi**, semua umur termasuk lansia, memakai **HP Android low-end**, sering di bawah **sinar matahari terik** (toko terbuka), dan koneksi internet **tidak selalu stabil**. Mobile-first, tapi ada beberapa layar back-office (laporan) yang juga dibuka di desktop/tablet. Aplikasi punya dua mode tampilan yang bisa dipilih pengguna sendiri lewat toggle: **Mode Sederhana** dan **Mode Lengkap** (lihat §3).

## 2. Prinsip Desain

- **Ramah pengguna awam** — tidak butuh manual, satu aksi utama selalu jelas terlihat di tiap layar.
- **Kontras tinggi** — harus tetap terbaca di bawah sinar matahari langsung, dan nyaman bagi mata yang kurang tajam.
- **Cepat & ringan** — hindari elemen visual berat (gradient rumit, animasi berlebihan, bayangan tebal).
- **Terpercaya** — ini aplikasi yang memegang data uang; visualnya harus terasa aman & profesional, bukan playful berlebihan.
- **Hangat & lokal** — bukan tampilan korporat dingin; harus terasa akrab untuk pemilik warung Indonesia.
- **Ikon selalu ditemani teks** — tidak pernah ada ikon berdiri sendiri tanpa label, karena tidak semua pengguna mengenali ikon abstrak.
- **Bahasa manusia, bukan istilah teknis** — "Tersimpan" bukan "Synced", "Coba lagi" bukan "Retry".

**Mood keywords:** hangat, terpercaya, cepat, akrab, modern-minimalis-tapi-hidup — bukan flat/dingin, bukan juga ramai/berantakan.

---

## 3. Mode Sederhana vs Mode Lengkap (Toggle)

Fitur inti untuk menjangkau **semua umur**, terutama pengguna gaptek. Toggle besar tersedia di halaman Pengaturan. Label yang tampil ke pengguna **selalu dalam Bahasa Indonesia awam** — "Tampilan Sederhana" dan "Tampilan Lengkap" (istilah "Lite/Full" hanya untuk dokumen internal ini, tidak pernah muncul di UI).

| Aspek | Mode Sederhana | Mode Lengkap |
|---|---|---|
| Navigasi | 3 menu besar saja: Kasir, Produk, Kas | Menu lengkap: Kasir, Produk, Stok, Pembelian, Kas, Laporan, Pelanggan, Karyawan |
| Beranda | 1 angka besar (penjualan hari ini) + 3 tombol aksi besar | Kartu ringkasan multi-metrik, grafik tren, daftar aktivitas |
| Istilah | Selalu bahasa paling awam, nol singkatan teknis | Boleh istilah bisnis standar (margin, BEP, ROI) — penggunanya lebih terbiasa |
| Laporan | Ringkasan sederhana saja, tanpa grafik kompleks | Laporan detail, grafik, ekspor PDF/Excel |
| Kepadatan visual | Sangat lega, elemen besar, sedikit pilihan per layar | Lebih padat, lebih banyak opsi terlihat sekaligus |
| Cocok untuk | Pengguna baru, lansia, belum terbiasa teknologi | Pengguna berpengalaman, bisnis lebih kompleks |

**Aturan penting:** data yang tersimpan **identik** di kedua mode — hanya tampilan yang berbeda. Transisi mode harus terasa aman dan reversibel (ada tombol jelas untuk kembali), jangan sampai pengguna takut kehilangan data saat berpindah mode.

---

## 4. Color Tokens

| Token | Hex | Penggunaan |
|---|---|---|
| `primary` | `#0E9F6E` | Warna brand utama — navigasi aktif, link, ikon terpilih, indikator "online"/berhasil |
| `primary-dark` | `#0B7A54` | State hover/pressed dari primary |
| `primary-soft` | `#E3F7EF` | Background badge/chip bernuansa primary |
| `accent` | `#FF6B4A` | **Hanya untuk SATU CTA terpenting per layar** — tombol Bayar, tombol utama form |
| `accent-dark` | `#E85535` | State pressed dari accent |
| `accent-soft` | `#FFE9E2` | Background badge bernuansa accent |
| `warning` | `#F5A623` | Stok rendah, status offline, buffer/perhatian |
| `warning-soft` | `#FEF3DD` | Background badge warning |
| `danger` | `#E5484D` | Error, hapus, void transaksi, gagal |
| `danger-soft` | `#FCE8E8` | Background badge danger |
| `info` | `#4C8DFF` | Notifikasi netral, status sinkronisasi berjalan |
| `info-soft` | `#EAF1FF` | Background badge info |
| `surface` | `#FAFAF8` | Background utama aplikasi |
| `surface-card` | `#FFFFFF` | Background kartu/elemen terangkat |
| `ink` | `#1A1D1B` | Teks utama/judul |
| `ink-soft` | `#60655F` | Teks sekunder/deskripsi/caption — **jangan** dipakai untuk info penting |
| `border` | `#E1E4E1` | Garis pembatas, outline input |

**Aturan pemakaian warna:** `accent` (oranye) tidak pernah dipakai lebih dari satu kali sebagai tombol dalam satu layar — itu jalan untuk membuat pengguna bingung mana yang harus ditekan. `primary` (hijau) adalah warna identitas yang tersebar (nav, link, badge), bukan warna tombol aksi. Maksimal 2 warna aksen mencolok per layar.

---

## 5. Typography

**Font:** Plus Jakarta Sans (satu keluarga font saja, semua berat/weight). Jangan campur dengan font lain. Rounded, ramah dibaca, dibuat di Indonesia — cocok untuk audiens semua umur.

| Style | Ukuran | Weight | Penggunaan |
|---|---|---|---|
| Display | 30px | Bold (700) | Judul layar besar, angka total di layar Kasir |
| H1 | 24px | Bold (700) | Judul halaman |
| H2 | 19px | SemiBold (600) | Judul seksi/kartu |
| Body | 16px | Regular/Medium (400/500) | Teks isi standar — **minimum 16px**, bukan 14px default web biasa |
| Body Small | 13px | Medium (500) | Label, caption, metadata — dipakai **terbatas**, tidak untuk info penting |
| Button Text | 16–18px | Bold (700) | Semua teks di dalam tombol |

**Angka & nominal uang:** selalu gunakan **tabular figures**, weight Bold/ExtraBold, dan ukuran lebih besar dari teks sekitarnya — nominal uang adalah elemen paling penting untuk dibaca sekilas di layar Kasir/laporan. Tidak ada teks di bawah 13px di seluruh aplikasi.

---

## 6. Spacing Scale

Base unit 4px: `4 · 8 · 12 · 16 · 24 · 32 · 48` — pakai kelipatan ini untuk semua padding/margin/gap, jangan angka bebas di luar skala ini.

## 7. Border Radius

| Token | Nilai | Penggunaan |
|---|---|---|
| `radius-sm` | 8px | Input, badge kecil |
| `radius-md` | 12px | Tombol, kartu |
| `radius-lg` | 20px | Bottom sheet, modal, kartu besar |
| `radius-full` | 999px | Pill/badge status, avatar |

## 8. Shadow / Elevation

Bayangan **halus dan tipis**, jangan gelap/tebal — nuansa hangat, bukan abu-abu netral pekat.

| Token | Nilai |
|---|---|
| `shadow-sm` | `0 1px 2px rgba(20,30,25,0.06)` |
| `shadow-md` | `0 4px 12px rgba(20,30,25,0.08)` |
| `shadow-lg` | `0 12px 32px rgba(20,30,25,0.12)` |

## 9. Iconography

Gaya ikon **rounded/filled**, bukan hairline/outline tipis — ikon tipis sulit terlihat di layar murah & bawah sinar matahari. Ukuran minimum 20px, warna mengikuti konteks (`ink-soft` default, `primary` saat aktif). **Selalu disandingkan label teks**, tidak pernah berdiri sendiri.

---

## 10. Component Conventions

- **Tombol Utama (CTA):** warna `accent`, `radius-md`, tinggi minimal **48px** (56px untuk aksi transaksi seperti "Bayar"), teks Bold, lebar penuh di mobile. Hanya satu per layar.
- **Tombol Sekunder:** outline 1px `border`, teks `ink`, background transparan/`surface-card`.
- **Tombol Bahaya:** background `danger`, dipakai hanya untuk konfirmasi final aksi merusak (void, hapus) — jangan pernah jadi tombol default.
- **Keypad Angka:** grid 3×4, tombol besar persegi `radius-sm`, dipakai untuk semua input angka (qty, harga, tunai) — jangan pakai keyboard sistem untuk input angka di Kasir.
- **Kartu (Card):** `surface-card`, `radius-md`, `shadow-sm`, padding 16–20px.
- **Badge Status Koneksi:** pill kecil `radius-full`, **selalu terlihat di topbar, tidak pernah berupa modal/popup**. `primary`=online, `warning`=offline, `info`=sedang sinkronisasi.
- **Badge Stok Rendah:** `warning-soft` background, teks `warning`, posisi & bentuk konsisten di semua layar (Dashboard, Stok, Kasir).
- **Input Field:** `radius-sm`, border 1px `border`, **label selalu di atas field** (bukan placeholder-only), tinggi minimal 48px.
- **Modal Konfirmasi (aksi destruktif):** `radius-lg`, judul jelas + penjelasan konsekuensi 1 kalimat, dua tombol dengan warna kontras jelas (netral "Batal" vs `danger` "Ya, lanjutkan").
- **Empty State:** ikon besar netral + 1 kalimat penjelasan + 1 tombol CTA jelas (bukan sekadar teks "tidak ada data").
- **Bottom Navigation (mobile):** ikon + label teks selalu tampil bersamaan, maksimal 5 item (3 item di Mode Sederhana), item aktif berwarna `primary`.
- **Toggle Mode Sederhana/Lengkap:** switch besar (mirip iOS/Android system toggle tapi diperbesar), dengan mini-ilustrasi/ikon di kedua sisi label agar jelas tanpa perlu membaca teks.

## 11. Layout

Mobile-first, lebar konten maksimal mengikuti device (360–430px). Layar back-office (Laporan/Dashboard analitik) boleh pakai layout 2 kolom di desktop (≥1024px). Touch target minimum **48×48px** di semua elemen interaktif (56px untuk aksi utama) — ini bukan opsional, target pengguna sering punya jari besar & layar kecil.

---

## 12. Do's and Don'ts

**DO:**
- Kontras tinggi, minimal setara WCAG AA
- Satu CTA utama per layar, selalu paling menonjol
- Nominal uang besar, tabular, Bold
- Ikon rounded/filled, ukuran cukup besar, selalu dengan label teks
- Status koneksi selalu terlihat sebagai badge kecil, bukan pop-up
- Bahasa Indonesia paling sederhana di semua teks UI, nol jargon teknis

**DON'T:**
- Jangan pakai teks abu-abu muda di atas putih untuk informasi penting
- Jangan taruh tombol "Hapus/Void" bersebelahan langsung tanpa jarak dari tombol aman
- Jangan campur lebih dari satu font family
- Jangan buat modal untuk status online/offline/sync
- Jangan gunakan placeholder sebagai satu-satunya label input
- Jangan pakai lebih dari satu warna `accent` sebagai tombol dalam satu layar yang sama
- Jangan pakai ikon tanpa label teks
- Jangan sembunyikan aksi penting di balik gestur rumit (swipe/long-press) sebagai satu-satunya cara

---

## 13. Cara Pakai File Ini di Stitch

1. Buka **stitch.withgoogle.com**, login dengan akun Google.
2. Buat project baru, lampirkan file `DESIGN.md` ini ke project — semua layar yang digenerate otomatis mengikuti token & aturan di atas.
3. Tempel isi **§1 Ringkasan Produk** sebagai prompt pertama untuk membangun konteks project.
4. Generate layar **satu per satu** memakai daftar di §14 — jangan gabungkan semua sekaligus supaya hasil presisi.
5. Hasil pertama biasanya masih draf kasar — lakukan 2–3 prompt lanjutan untuk memperhalus detail sebelum dianggap final.
6. Pakai mode **Thinking/Experimental** untuk layar penting (Kasir/POS), mode **Flash/Standard** untuk eksplorasi cepat layar lain.
7. Setelah puas, export ke **Figma** atau kode **HTML/CSS** untuk lanjut ke pengembangan.

---

## 14. Daftar Layar (referensi generate)

Generate satu per satu di Stitch, bukan sekaligus — semua tetap mengikuti sistem di atas.

1. **Onboarding/Setup Toko** — form singkat 2–3 langkah, progress indicator, opsi "Lewati"
2. **Dashboard** — *buat 2 varian:* Mode Sederhana (1 angka besar + 3 tombol aksi cepat) dan Mode Lengkap (kartu ringkasan multi-metrik + grafik tren + badge stok rendah)
3. **Kasir/POS** — grid produk, keranjang, keypad angka, badge status koneksi, tombol Bayar lebar penuh di bawah
4. **Tambah Produk** — form dengan foto, kategori, harga modal/jual, stok awal & ambang stok rendah
5. **Manajemen Stok** — list produk dengan badge stok rendah konsisten, filter, tombol opname
6. **Purchase Order** — pilih supplier, daftar item, total estimasi, kirim PO, opsi simpan draft
7. **Buku Kas** — ringkasan masuk/keluar, list transaksi, tombol tambah pengeluaran
8. **Laporan/Dashboard Analitik** (layout desktop 2 kolom, khusus Mode Lengkap) — kartu ringkasan + grafik arus kas & produk terlaris
9. **Pengaturan** — kartu besar berisi toggle Mode Sederhana/Lengkap dengan ikon+deskripsi tiap pilihan, di bawahnya menu Profil Toko/Karyawan/Bahasa/Bantuan

---

*Catatan: jika hasil generate Stitch terasa kurang presisi dengan prompt Bahasa Indonesia, file ini bisa diminta diterjemahkan ke Bahasa Inggris — struktur token & aturan tetap sama, hanya bahasanya berubah.*