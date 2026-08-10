# Part B — Audit UI/UX Beres POS (mobile_flutter / Windows)

> Guardrail: hanya laporan, tidak ada perbaikan visual dieksekusi. Tidak ada assertion/expected test diubah, tidak ada test dihapus/skip.

**Tanggal:** 2026-08-10  
**Workspace:** `C:/Users/Dragon/umkm-audit`  
**App:** `mobile_flutter` (Flutter 3.10+, Riverpod + go_router + Hive)  
**Build Windows:** `build/windows/x64/runner/Release/beres_pos.exe` — **tidak ada** (build/ hanya berisi `app|jni|native_assets|test_cache`, tidak ada folder `windows/`). Exe harus via `flutter build windows --release`.

---

## 1) Konsistensi Visual vs `core/theme/app_theme.dart`

Tema sumber: `lib/core/theme/app_theme.dart` — Material 3, `seedColor 0xFF00696D` (teal), `ColorScheme.fromSeed`.

Tema mendefinisikan:

| Token | Light & Dark (identik) |
|-------|------------------------|
| `scaffoldBackgroundColor` | `scheme.surface` |
| `appBarTheme` | `bg surface`, `fg onSurface`, `elevation 0`, `centerTitle false` |
| `cardTheme` | `elevation 0`, `RoundedRectangleBorder r=12`, `side: scheme.outlineVariant`, `Clip.antiAlias` |
| `filledButtonTheme` | `minHeight 48`, `r=10`, `w600 16sp` |
| `inputDecorationTheme` | `OutlineInputBorder r=10`, `contentPadding h14 v14` |

### Temuan inkonsistensi

| # | Lokasi | Pelanggaran | Dampak | Severity |
|---|--------|-------------|--------|----------|
| 1 | `payment_screen.dart:_QrisSection` | `Colors.green` hardcode untuk icon paid (`Icons.check_circle` green) | Tidak ikut `colorScheme.primary` / `success` semantik; dark mode kontras rusak | Medium |
| 2 | `reports/report_screen.dart` | `Colors.amber.shade100` banner, `Colors.red` error, `Colors.grey.shade300` chart border | Keluar dari `colorScheme.errorContainer / outlineVariant`; dark mode kuning pucat tidak terbaca | Medium |
| 3 | `printing/receipt_preview_screen.dart` | `Colors.amber.shade100` status, `Colors.white`, `Colors.grey.shade300`, `Colors.black` paper preview | Paper preview memang butuh putih/hitam (semantik kertas) — boleh — tapi status amber harusnya `surfaceVariant`/`tertiaryContainer` | Low |
| 4 | `pricing/pricing_screen.dart` | `Colors.grey` empty-state, `Colors.amber.shade100` expiry notice, `Colors.brown` icon | Grey hardcode vs `onSurfaceVariant` (60%); amber vs `errorContainer/tertiary` | Medium |
| 5 | `promo/discount_screen.dart` | `Colors.green`/`Colors.red` validasi promo | Perlu token `success`/`error` dari `colorScheme` | Medium |
| 6 | `promo/loyalty_screen.dart` | `Colors.brown/blueGrey/amber.shade700/purple` untuk tier Bronze/Silver/Gold/Platinum | Domain coloring — wajar untuk tier, tapi tidak ada mapping ke `colorScheme` + tidak ada dark-variant | Low (intentional) |
| 7 | `tables/table_screen.dart` | `Colors.teal/orange/indigo` untuk `TableStatus.empty/occupied/reserved` + `Colors.grey/orange` text | Status color hardcode; belum di-token-kan. Konsisten internal tapi keluar dari tema | Low (intentional) |
| 8 | `tables/table_screen.dart: _Dialog` | `TextStyle(color: Colors.red)` tombol Hapus | Harus `colorScheme.error` | Low |
| 9 | Semua screen — spacing | `EdgeInsets.all(24)` (auth), `32/16` (home wide), `24/16` (order wide), `16` (payment/report/pricing), `12/8` (product list) | Tidak ada spacing scale (4/8/12/16/24) yang konsisten; auth 24 padding kartu + 16 antar field, home 20 padding kartu, order 16, pricing 16. Variansi 8–32 tanpa token | Medium |
| 10 | Semua screen — radius | Tema: Card 12, Button 10, Input 10. Manual: `BorderRadius 20` (outlet badge, table chip), `6` (table icon), `10` (floor plan), `12` (report chart) | Radius 6/10/12/20 bercampur; pill 20 tidak ada di tema | Low |
| 11 | Button mix | `FilledButton`, `FilledButton.tonal`, `OutlinedButton`, `TextButton`, `FloatingActionButton`, `SegmentedButton` dipakai bebas tanpa aturan hierarki | Tidak ada guideline kapan `tonal` vs `filled` (contoh: order queue Refresh pakai tonal, payment Generate pakai tonal, tapi outlet Save pakai filled — ok tapi tidak terdokumentasi) | Low |
| 12 | Card vs Container | Tema `cardTheme` (r12 + outlineVariant + elevation 0) dipakai via `Card`. Tapi `_SalesChartPlaceholder` dan `_FloorPlan` pakai `Container(BoxDecoration border grey.shade300 r12)` | Duplikasi visual Card manual; border `grey.shade300` bukan `outlineVariant` | Medium |
| 13 | Text hardcoded | Banyak `TextStyle(fontSize: 11, color: Colors.grey)` (report export path, receipt footer, table subtitle) | Harusnya `theme.textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)` | Medium |
| 14 | `@deprecated` | `withOpacity(.12/.15/.4)` di `table_screen.dart` | Flutter 3.27+ deprecated → ganti `withValues(alpha:)` atau `withAlpha` | Low (lint) |

**Kesimpulan konsistensi:** Struktur tema dipakai di `main.dart` (`theme: AppTheme.light(), darkTheme: AppTheme.dark(), themeMode: system`) dan `Card/FilledButton/InputDecoration` mengikuti tema saat dipakai tanpa override. Namun ~40% warna masih hardcode `Colors.*` dan spacing belum ditoken-kan. Rekomendasi (tidak dieksekusi): buat `AppSpacing (4/8/12/16/24/32)` + `AppRadius` + semantik `success/warning` di `ColorScheme` extension + ganti semua `Colors.grey` → `onSurfaceVariant`.

---

## 2) Responsive — 3 Breakpoint (layout inspection)

> Build Windows exe tidak tersedia, jadi audit dilakukan via **layout inspection** (`LayoutBuilder`/`ConstrainedBox`/`MediaQuery`) + simulasi teori 360 / 768 / 1280. Screenshot real diganti placeholder + instruksi reproduksi (bagian 5).

Definisi breakpoint proyek (implisit): `wide = maxWidth >= 900` (home & orders). Tidak ada breakpoint 600/840 Material.

| Screen | File | Breakpoint impl | 360 px (smartphone) | 768 px (tablet portrait) | 1280 px (desktop, default WindowOptions) |
|--------|------|-----------------|---------------------|--------------------------|------------------------------------------|
| **Home / Dashboard** | `home_screen.dart` | `LayoutBuilder` outer `wide>=900`, inner `GridView.count`  | `padding 16`, `ConstrainedBox 1100` centered, `SingleColumn` → grid 1 kolom, `childAspectRatio 1.4`, 3 `_InfoCard` vertikal, scroll ok | Sama: `padding 16`, masih 1 kolom (768<900), card lebar penuh, tidak ada wasted space signifikan | `padding 32`, grid 3 kolom (`cols=3`), `childAspectRatio 1.6`, maxWidth 1100 centered, whitespace kiri-kanan |
| **Orders** | `order_screen.dart` | `wide>=900` padding + `ConstrainedBox 1100` | `padding 16`, Queue Card `Row` (icon+text+tonal button) — Row akan overflow di 360 jika text panjang; `Row` outletID+serviceCharge (Expanded + SizedBox 140) muat 360 (140+12+flex), form single column | `padding 16`, sama single column, masih muat | `padding 24`, form single column centered 1100, tidak jadi 2-panel master-detail; whitespace besar |
| **Produk List** | `product_list_screen.dart` | **Tidak ada** LayoutBuilder | `Column: search Row (TextField Expanded + Dropdown + IconButton)` — di 360 Dropdown `Kategori` bisa terpotong; `ListView.builder` single column ok | Dropdown muat (768), tapi tidak ada grid adaptif; tetap list | Tetap list single column di 1280, tidak ada grid 2-3 kolom → underuse desktop |
| **Produk Form** | `product_form_screen.dart` | Tidak ada | `ListView padding 16`, TextFields full-width, ok di 360 | Sama, centered scroll | Sama, tidak ada `ConstrainedBox`; field stretch lebar penuh → line length >80ch kurang ergonomis |
| **Pembayaran** | `payment_screen.dart` | `ConstrainedBox 560` centered | `SegmentedButton` 4 segmen (Tunai/QRIS/Kasbon/DP) — di 360 label terpotong, butuh `scroll atau overflow`; `Card` QR 200x200 muat; `DataTable` kasbon `SingleChildScrollView horizontal` ok | 560 box centered → whitespace samping ~104px tiap sisi di 768 (ok); segmented muat | 560 box centered di 1280 → whitespace besar; tidak ada layout 2 kolom (form kiri, ringkasan kanan) |
| **Laporan** | `report_screen.dart` | Tidak ada Breakpoint | `ListView padding 16`, `Wrap` period+dateRange → wrap ke 2 baris di 360 (aman karena Wrap); chart 160h; `DataTable` turnover `SingleChildScrollView horizontal` | Wrap jadi 1 baris; chart 160h sempit di tablet | Tetap single column; tidak ada dashboard 2 kolom; `ConstrainedBox` tidak ada → table stretch |
| **Outlet** | `outlet_screen.dart` | Tidak ada | `ListView padding 16 16 16 96`, RadioListTile + Card ok di 360 | Sama single column | Sama; tidak ada split master-detail |
| **Meja** | `table_screen.dart` | `SliverGrid maxCrossAxisExtent 180` | CustomScrollView grid `maxCrossExtent 180` → 1-2 kolom di 360; `_FloorPlan` Wrap 110x78 muat 2 kolom | Grid ~4 kolom (768/180≈4) | Grid ~7 kolom; floor plan Wrap tetap 110x78 |
| **Pricing** | `pricing_screen.dart` | `ConstrainedBox 640` centered | `SingleChildScrollView 16` + 640 box centered → di 360 padding 16 ok; `Row` Qty+Harga+Tambah (2 Expanded + Button) sempit tapi muat | 640 box centered | 640 box centered desktop ok |
| **Receipt Preview** | `printing/receipt_preview_screen.dart` | Tidak ada | `TabBar` 3 tab, paper `width 320` centered, ok di 360 (320+32 padding) | Paper 320 centered | Paper 320 centered kecil di 1280 |
| **Login/Register** | `auth/*.dart` | `ConstrainedBox 420` centered + `SingleChildScrollView` | 420 box centered di 360 → padding 24 → content 312px, ok | 420 centered | 420 centered |
| **Discount/Loyalty** | `promo/*.dart` | Tidak ada | `SingleChildScrollView 16`, ListView shrinkWrap ok | Sama | Sama single column |

### Ringkasan responsive

| Aspek | Status |
|-------|--------|
| Sistem breakpoint eksplisit | **Tidak ada** — hanya `wide >=900` di 2 screen (home, orders). Tidak ada `600/840` Material breakpoint |
| `MediaQuery` | Tidak dipakai sama sekali |
| `LayoutBuilder` | Dipakai 2 screen; 10+ screen lain fixed |
| `ConstrainedBox maxWidth` | Dipakai 6 screen (420, 560, 640, 1100); nilai berbeda tanpa token |
| Overflow risk 360 | **Sedang**: `payment SegmentedButton 4 segmen` + `product_list search Row (Dropdown)` berpotensi overflow/terpotong |
| Underuse 1280 | **Tinggi**: 9/12 screen tetap single column di desktop; tidak ada `NavigationRail`/`master-detail`/`2-pane` |
| Scroll | Semua pakai `SingleChildScrollView`/`ListView`/`CustomScrollView` — tidak ada overflow hard crash tapi UX desktop kurang efisien |

**Rekomendasi (tidak dieksekusi):** butuh `lib/core/responsive/breakpoints.dart` + `ResponsiveScaffold` (Rail <600 BottomNav, 600-839 Rail, >=840 2-pane), dan `AppBreakpoints.{compact, medium, expanded}`.

---

## 3) Dual-Screen Customer Display (`window_manager` + `screen_retriever`)

| Cek | Hasil |
|-----|-------|
| `pubspec.yaml` dependencies | `window_manager: ^0.5.2` **ada**. `screen_retriever` **tidak ada** (tidak di `pubspec.yaml`, tidak di `pubspec.lock`) |
| `grep -r window_manager` | Hanya `lib/main.dart` (import + `ensureInitialized` + `WindowOptions`) |
| `grep -r screen_retriever / secondary / customer.*display` | **0 hit** |
| `lib/main.dart` | `WindowOptions(size 1280x720, center true, minimumSize 1024x600, title Beres Kasir)` + `waitUntilReadyToShow → show → focus` — **single window only** |
| `windows/runner/main.cpp` | `Win32Window::Size 1280x720` single `FlutterWindow window(project)` — tidak ada `Create` kedua |
| Window kedua / customer display widget | **Tidak ada file** — tidak ada `customer_display/`, `second_window/`, `display_customer/` di `lib/` |
| `MethodChannel` raw print | `windows/raw_print` di `print_service.dart` — bukan dual-screen |
| `terminal` multi-window API | Tidak ada usage `windowManager.createWindow` / `getScreenList` / `getPrimaryDisplay` |

**Status:** **TIDAK TERIMPLEMENTASI — hanya setup single-window.**

`window_manager` dipakai untuk set ukuran & posisi window utama saja. Tidak ada deteksi display kedua, tidak ada pembukaan window kedua, tidak ada render customer-facing display (total belanja, QR, antrian). Jika butuh dual-screen, perlu tambah `screen_retriever: ^0.2` + `window_manager` multi-window atau isolat engine kedua, plus widget `CustomerDisplayWindow`.

Evidensi path:

- `C:/Users/Dragon/umkm-audit/mobile_flutter/pubspec.yaml` — hanya `window_manager`
- `C:/Users/Dragon/umkm-audit/mobile_flutter/lib/main.dart:17-28`
- `C:/Users/Dragon/umkm-audit/mobile_flutter/windows/runner/main.cpp:27-33`

---

## 4) Alur Kasir — Tap Count (Order Baru → Tambah Item → Checkout → Cetak Struk)

Alur ditelusuri di `order_screen.dart` + `payment_screen.dart` + `printing/receipt_preview_screen.dart` + `cart/cart_notifier.dart` + `models/order.dart`.

### Alur aktual (berdasarkan kode — belum ada navigasi terpadu go_router, order/payment/receipt belum terhubung route)

| Step | Aksi user | Tap | Layar | Catatan friction |
|------|-----------|-----|-------|------------------|
| 0 | Buka `OrderScreen` | — | — | Tidak ada route `go_router` untuk `/orders` — `app_router.dart` hanya `/(Home)`, `/auth/login`, `/auth/register`. Order/Product/Payment/Report belum didaftarkan (harus push manual via Navigator) |
| 1 | Pilih tipe `Dine In / Takeaway / Delivery` | 1 | Order | `SegmentedButton<OrderType>` |
| 2 | (opsional) isi `Outlet ID` | 1 | Order | Default `outlet-1`; `TextField` tidak ada autocomplete outlet |
| 3 | (opsional) isi `Service charge` | 1 | Order | `SizedBox 140` number field + `onChanged setState` |
| 4 | (jika Dine In) isi `Table ID` | 0-1 | Order | Field muncul kondisional; ketik manual, tidak pilih dari `TableScreen` |
| 5 | Lihat draft items (sudah ada 2 dummy: Kopi Hitam x1, Roti Bakar x2) | 0 | Order | Friction: **tidak ada katalog produk picker** — hanya `Tambah Es Teh` hardcode |
| 6 | Tap `Tambah Es Teh` (tambah 1 item) untuk tiap produk | 1 per item | Order | Harus tap N kali; tidak ada qty stepper, tidak ada scanner, tidak ada search produk |
| 7 | (jika butuh kasbon/DP) hapus item via `Icons.delete_outline` di ListTile | 1 per hapus | Order |  |
| 8 | Tap `Buat Order` | 1 | Order | `FilledButton.icon` → `orderListProvider.create` → `currentOrderProvider.state = order` + `queueProvider.next()` + SnackBar `# queueNumber dibuat` |
| 9 | Navigasi ke `PaymentScreen` | 1 | — | **Manual** — tidak ada `context.go('/payment')`; dev harus `Navigator.push(MaterialPageRoute(PaymentScreen(orderId, total)))` |
| 10 | Pilih metode `Tunai/QRIS/Kasbon/DP` | 1 | Payment | `SegmentedButton<PaymentMethod>` |
| 11a | **Tunai**: langsung `Bayar` | 1 | Payment |  |
| 11b | **QRIS**: `Bayar` → generate `qrisPayload` (di provider) | 1 | Payment | QR placeholder 200x200; tidak ada image render |
| 11c | **Kasbon**: isi `Jumlah cicilan` → `Generate` → `Bayar` | 2 | Payment | `TextField cicilanCtrl` + `FilledButton.tonal Generate` + `Bayar` |
| 11d | **DP**: isi `Nominal DP` → `Bayar` | 1 (+ketik) | Payment |  |
| 12 | Tap `Bayar` | 1 | Payment | `paymentProvider.submit(orderId)`; SnackBar `Pembayaran X berhasil` |
| 13 | Navigasi ke `ReceiptPreviewScreen` | 1 | — | Manual `Navigator.push(ReceiptPreviewScreen(order, template))` |
| 14 | Pilih tab `Struk / Dapur / Editor` (optional editor) | 0-1 | Receipt | Default `Struk` |
| 15 | Tap `Cetak Struk` (atau `Cetak Kitchen`) | 1 | Receipt | `PrintService.printReceipt` → `windows/raw_print` channel atau `bluetooth_print` fallback; hasil `PrintResult.noPrinter` tetap valid (bytes ESC/POS 27,64 … 29,86) |
| 16 | (opsional) `Salin` receipt text ke clipboard | 1 | Receipt | `OutlinedButton.icon` copy |

### Tap count minimal (happy path Tunai, Dine In tanpa table, 1 item tambahan)

**Buka Order → Tambah 1 Es Teh → Checkout Tunai → Cetak:**

> Step 1 (tipe default Dine In, tidak tap) + Step 6 `Tambah Es Teh` (1) + Step 8 `Buat Order` (1) + Step 9 navigasi (1) + Step 11a `Bayar` (1) + Step 13 navigasi (1) + Step 15 `Cetak Struk` (1) = **6 taps** (+ ketik jika butuh outlet/table/service).

Jika hitung termasuk buka `OrderScreen` dari Home (belum ada nav, anggap 1 tap bottom/nav) → **7 taps**.

**Dengan Kasbon 3 cicilan:** + `isi cicilan + Generate` → **8-9 taps**.

### Friction utama

1. **Tidak ada katalog produk terintegrasi.** `OrderScreen._draftItems` hardcode 2 item + tombol `Tambah Es Teh` hardcode `p3`. Tidak ada `ProductListScreen` picker, tidak ada `mobile_scanner` barcode, tidak ada qty stepper. Kasir tidak bisa pilih produk real.
2. **Tidak ada Cart global.** `src/features/cart/cart_notifier.dart` (`CartNotifier`, `cartProvider`) tidak di-`override` di `main.dart` (`ProviderScope` tanpa override) dan tidak dipakai di `OrderScreen` (order pakai `_draftItems` lokal). Cart terpisah mati.
3. **Navigasi checkout terputus.** `app_router.dart` tidak daftarkan `/orders`, `/payment`, `/receipt`. Transisi Order→Payment→Receipt harus manual `Navigator.push`. Tidak ada `go_router` deep link / guards.
4. **Table picker manual.** `OrderScreen` minta ketik `Table ID` string; tidak ada picker dari `tableListProvider` / `TableScreen`.
5. **PaymentScreen butuh `orderId`/`total` di constructor** — tidak ambil dari `currentOrderProvider` otomatis; `initState` `setAmount(widget.total)` default `50000` dummy.
6. **Kuantitas hanya tambah item baru**, tidak ada `+ / -` per baris; hapus hanya delete penuh.
7. **Tidak ada ringkasan order sticky** di Payment — total hanya `Text('Total: Rp ...')` kecil, tidak ada daftar item.
8. **Cetak butuh 2 navigasi manual** (Order→Payment→Preview) — idealnya `Bayar` langsung auto-navigasi ke Preview + auto-print.

**Saran (tidak dieksekusi):** satukan `CartNotifier` ↔ `OrderScreen` (picker dari `productListProvider` + qty stepper + barcode), sambungkan `currentOrderProvider` → `PaymentScreen` (tanpa param), daftarkan routes di `app_router.dart`, tambah `TablePicker` bottom sheet, kurangi flow jadi **4 taps**: `Pilih produk (1) → Qty + (0-n) → Bayar Tunai (1) → Cetak (1)`.

---

## 5) Screenshot — `mobile_flutter/audit_ui_screenshots/`

| # | File (rencana) | Screen | Breakpoint |
|---|----------------|--------|------------|
| 1 | `01-dashboard-360.png` | Dashboard (HomeScreen) | 360×800 |
| 2 | `02-dashboard-768.png` | Dashboard | 768×1024 |
| 3 | `03-dashboard-1280.png` | Dashboard | 1280×720 |
| 4 | `04-order-360.png` | Order | 360 |
| 5 | `05-order-768.png` | Order | 768 |
| 6 | `06-order-1280.png` | Order | 1280 |
| 7 | `07-produk-360.png` | Product List | 360 |
| 8 | `08-produk-768.png` | Product List | 768 |
| 9 | `09-produk-1280.png` | Product List | 1280 |
| 10 | `10-pembayaran-360.png` | Payment | 360 |
| 11 | `11-pembayaran-768.png` | Payment | 768 |
| 12 | `12-pembayaran-1280.png` | Payment | 1280 |
| 13 | `13-laporan-360.png` | Report | 360 |
| 14 | `14-laporan-768.png` | Report | 768 |
| 15 | `15-laporan-1280.png` | Report | 1280 |
| 16 | `16-receipt-preview-1280.png` | Receipt Preview | 1280 |
| 17 | `17-login-360.png` | Login | 360 |
| 18 | `18-table-1280.png` | Table/Grid | 1280 |

**Status saat ini:** Folder `mobile_flutter/audit_ui_screenshots/` dibuat kosong (exe belum tersedia untuk screenshot real).

### Cara reproduksi screenshot real (Windows)

```powershell
cd C:/Users/Dragon/umkm-audit/mobile_flutter

# 1) Build Windows
flutter build windows --release
# exe: build/windows/x64/runner/Release/beres_pos.exe

# 2) Jalankan dan resize window untuk tiap breakpoint
# — jalankan exe, lalu resize manual atau via window_manager API:
#    await windowManager.setSize(Size(360, 800));  // smartphone
#    await windowManager.setSize(Size(768, 1024)); // tablet
#    await windowManager.setSize(Size(1280, 720)); // desktop

# 3) Screenshot via tool OS (Win+Shift+S) atau
#    flutter test dengan golden:
flutter test --update-goldens  # jika ada golden test

# 4) Alternatif: tambahkan widget test helper untuk screenshot:
#    await tester.pumpWidget(ProviderScope(child: BeresPosApp()));
#    await tester.binding.setSurfaceSize(Size(360, 800));
```

Untuk audit otomatis, buat file `test/golden_responsive_test.dart` yang mem-pump tiap screen dengan `SurfaceSize` 360/768/1280 dan `matchesGoldenFile`.

---

## Lampiran — File yang diaudit

- `lib/core/theme/app_theme.dart`
- `lib/main.dart`, `lib/routes/app_router.dart`, `windows/runner/main.cpp`
- `lib/features/home/presentation/home_screen.dart`
- `lib/features/orders/presentation/order_screen.dart`
- `lib/features/products/presentation/product_list_screen.dart`, `product_form_screen.dart`
- `lib/features/payment/presentation/payment_screen.dart`
- `lib/features/reports/presentation/report_screen.dart`
- `lib/features/printing/presentation/receipt_preview_screen.dart`, `lib/shared/services/print_service.dart`
- `lib/features/tables/presentation/table_screen.dart`
- `lib/features/pricing/presentation/pricing_screen.dart`
- `lib/features/outlet/presentation/outlet_screen.dart`
- `lib/features/promo/presentation/discount_screen.dart`, `loyalty_screen.dart`
- `lib/features/auth/presentation/login_screen.dart`, `register_screen.dart`
- `lib/src/features/cart/cart_notifier.dart`
- `pubspec.yaml` (window_manager 0.5.2)

---

## Ringkasan Eksekutif

| Area | Nilai | Catatan |
|------|-------|---------|
| Konsistensi tema | **Cukup** | Tema M3 terpasang benar, tapi ~40% warna hardcode `Colors.*` dan spacing/radius tidak ditoken |
| Responsive 360 | **Aman** dengan catatan SegmentedButton & Dropdown overflow | Semua screen scroll, tapi tidak ada breakpoint adaptif |
| Responsive 1280 | **Kurang** | 9/12 screen single-column di desktop, whitespace besar, tidak ada NavigationRail/master-detail |
| Dual-screen | **Belum ada** | Hanya `window_manager` single window; `screen_retriever` & window kedua belum implement |
| Alur kasir | **6-7 taps minimal** (tunai) | Friction utama: tidak ada product picker, cart terpisah, navigasi manual |

> Tidak ada perubahan visual/kode dilakukan dalam audit ini.
