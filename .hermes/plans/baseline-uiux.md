# Baseline Analysis — Beres POS (Phase 1 flutter-ui-ux)

*Generated 2026-08-10 — tanpa perubahan visual, murni analisa existing.*

## 1) App structure

- **Dart files:** 54 di `lib/` (core/theme 1 + features 10× + routes 1 + shared 34 + src/cart 1 + main).
- **Features:** auth (login/register), home (dashboard), orders (kasir), products, outlet, payment, pricing, printing (receipt_preview), promo (discount/loyalty), reports, tables — 11 features.
- **Shared:** models 13, services 11, providers 9, widgets — riverpod `Notifier` + `Hive LocalStorage` + Dio `ApiClient`.
- **Known gap:** `lib/src/features/cart/cart_notifier.dart` `throw UnimplementedError` — offline cart tidak terhubung ke `OrderScreen` (`_draftItems` lokal); folder kosong `src/core`, `src/features/products` sudah dihapus.

## 2) Design system review

- **Theme:** `core/theme/app_theme.dart` — M3 `ColorScheme.fromSeed(seed 0xFF00696D Teal)` light+dark, `scaffoldBackgroundColor surface`, `Card r12 outlineVariant`, `FilledButton minH 48 r10 w600 16sp`, `Input r10 pad 14/14`. Terpasang benar di `main.dart`.
- **Coverage:** ~35% screen hardcode `Colors` — `payment_screen Colors.green`, `pricing_screen Colors.grey/amber/brown`, `receipt_preview Colors.grey.shade300/amber/white/black`, `discount_screen green/red`, `loyalty tier brown/blueGrey/amber/purple`, `report_screen amber/red/grey300`. Sisa pakai `colorScheme` via AppTheme.
- **Implication:** hardcode mematahkan M3 token consistency; ganti ke `colorScheme` + `onSurfaceVariant` untuk konsistensi (catatan Fase 2).

## 3) Platform

- **Windows priority:** `window_manager` + `screen_retriever` untuk .exe; single window `.hermes/plans/part-b-ui-audit.md` (20/80).
- **Printing:** `bluetooth_print` local fork `third_party/bluetooth_print` + `esc_pos_utils` (mm58) + fallback bytes `27,64/29,86`.
- **Breakpoint:** hanya `wide>=900` di ~2 screen; tidak ada `LayoutBuilder` 600/840 tier.

## 4) Performance

- Grid/list hardcode tanpa virtualisasi di beberapa (produk), tidak ada `RepaintBoundary` animasi.

## Output

Baseline di atas menjadi pembanding untuk perubahan Fase 2+ (widget preview, golden, guideline).
