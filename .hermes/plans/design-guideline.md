# Design Guideline — Beres POS (Windows .exe)

> **Status:** Riset & guideline saja, **belum dieksekusi** ke screen. Review dulu sebelum diterap ke 12 screen.
> Eksepsi: UAC/elevated Start blocked — screenshot asli Part B masih placeholder SVG; exe build berhasil (89K, 56.6s).

## Referensi
- **Material 3** — ColorScheme.fromSeed(teal 0xFF00696D), Type Scale (display/headline/title/label/body), Elevation 0 + outlineVariant.
- **Square POS / Toast POS** — hierarki: **total harga** paling menonjol (48-56sp bold), tombol **Checkout** fixed bottom, katalog grid 3-col desktop, lane kanan ringkasan.
- **POS kontras cepat** — background surface, primary teal, error red, success green semantic; zak tool 4/8px untuk tangkas.

## Token yang disepakati (untuk eksekusi nanti)

| Token | Nilai | Catatan |
|-------|-------|---------|
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 | Grid 4px, section 24-32, card inner 12-16 |
| Radius | Card 12, Button 10, Input 10, Pill 20, Icon 6 | Tema sudah 12/10/10 — Pill 20 & 6 perlu AppRadius |
| Typography | titleLarge 22/28, headlineSmall 24, labelLarge 14-16 w600, bodySmall 11-12 onSurfaceVariant | Kasir total → headlineLarge 32 bold |
| Colors | primary 0xFF00696D, error, success=primaryContainer, warning=tertiaryContainer, outlineVariant | Ganti Colors.green/red/amber/grey hardcode → colorScheme |
| Breakpoints | compact <600, medium 600-839, expanded >=840 (840 → 2-pane master-detail) | Kini hanya wide>=900 di 2 screen |

## Aturan komponen
- **Button:** primary `FilledButton` (checkout), secondary `FilledButton.tonal` (Generate), tertiary `OutlinedButton`, FAB hanya untuk add meja.
- **Card:** elevation 0 + border outlineVariant + r12; jangan Container manual grey.shade300.
- **Input:** r10 + contentPadding h14 v14 (sudah di tema).
- **Text:** `Colors.grey` → `colorScheme.onSurfaceVariant` (60%); `withOpacity` → `withValues(alpha:)`.

## Layout POS (desktop 1280)
- **Katalog kiri (flex 2):** Grid 3-col, search + filter chip.
- **Ringkasan kanan (flex 1, sticky):** Cart list + Total besar + Checkout fixed bottom.
- **Rail:** NavigationRail untuk 12 fitur, bukan drawer.

## Tom: konsisten dulu, bukan redesign penuh
Tidak menambah dependency baru; hanya AppSpacing/AppRadius + replace Colors.* + satu ResponsiveScaffold.

> Eksekusi visual ditunda — tunggu approval guideline ini.