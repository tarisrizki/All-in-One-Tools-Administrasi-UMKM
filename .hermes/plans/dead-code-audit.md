# Laporan Dead Code — mobile_flutter (audit, belum hapus)

## Ringkasan
- **Lib files:** 27 dart (1 app_theme + 12 screens + 12 shared models + ...). Tidak ada duplikat service/provider.
- **Backend modules:** 20, semua ter-route di `index.ts` — tidak ada dead route.
- **Screenshot placeholder:** 18 SVG di `audit_ui_screenshots/` — perlu ganti PNG asli (Part B).

## Kandidat dead / perlu review

| # | Path | Alasan | Aksi |
|---|------|--------|------|
| 1 | `lib/src/features/cart/cart_notifier.dart` | Hanya di-import `test/cart_test.dart` + `coverage/lcov.info`, tidak di `main.dart`/`shared`/`features`. `cartProvider` `throw UnimplementedError`. Offline cart direncanakan (Hive) tapi tidak terhubung ke `OrderScreen` (order pakai `_draftItems` lokal). | **Perlu review manual** — jangan hapus dulu; keputusan: integrasikan ke order flow atau tandai deprecated. |
| 2 | `lib/src/features/products/` (folder kosong) | `ls src/features/products` kosong, `src/core` kosong. Sisa merge 12 workstream — struktur lama yang tidak jadi dipakai. | **Aman hapus** — `src/features/products/` + `src/core/` (folder kosong). `src/` sendiri berisi `cart_notifier`. |
| 3 | `audit_ui_screenshots/*.svg` (18 file) | Placeholder SVG 484 bytes dummy, bukan capture Windows asli. | **Replace** dengan PNG asli via `flutter run -d windows` (Part B). |
| 4 | `backend-workers/.wrangler/` | Build cache, tidak perlu di-commit (sudah di .gitignore). | **Biarkan ignore**. |
| 5 | `mobile_flutter/third_party/bluetooth_print/` — file `.bak` sisa patch | Sudah di-clean di resume4 (bak dihapus). Sisa vendored valid. | **Sudah bersih**. |

## Tidak dead (verifikasi)
- Semua `shared/models/*.dart` (13 file) di-import providers/screens — terpakai.
- Semua `shared/services/*.dart` (11) + `shared/providers/*.dart` (9) terpakai.
- `lib/routes/app_router.dart` dipakai `main.dart`, tapi hanya 3 routes (`/`, `/auth/login`, `/auth/register`) — orders/products/payment belum terdaftar (friction audit Part B §4), bukan dead tapi **gap** yang intentional untuk task desain berikutnya.
- `backend-workers/src/modules/*.ts` semua ter-route, tidak ada `.bak`.

## File count
- **Before:** mobile_flutter/lib 30 dart (27 lib + 1 main + 1 app_router + 1 theme), backend 23 modules.
- **After (rencana):** hapus 2 folder kosong (0 file), replace 18 SVG → PNG (count sama), cart tetap 1 file pending review.

> Guardrail: tidak ada test assertion yang diubah, tidak ada test yang dihapus/skip untuk audit ini.