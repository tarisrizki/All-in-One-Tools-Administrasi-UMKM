# Dead Code Audit - Frontend

Dokumen ini mencatat dead code yang ditemukan tapi tidak dihapus karena belum 100% yakin.

## Suspicious / Needs Review

### src/lib/index.ts
- File ini hanya komentar placeholder `// place files you want to import through the $lib alias in this folder.`
- Mungkin bisa dihapus atau perlu dipertahankan sebagai dokumentasi

### src/lib/utils/api.ts
- `getApiUrl` diexport tapi juga digunakan internal di dalam file yang sama
- Semua usage terlihat legitimate, tidak ada dead code

### src/lib/db.ts
- Semua exports (LocalProduct, LocalCategory, LocalCustomer, PendingTransaction, db) dipakai
- Tidak ada dead code

### src/lib/stores/sync.svelte.ts
- `getApiUrl` di-import tapi tidak digunakan dalam file ini (hanya `apiClient` yang dipakai)
- Perlu dicek: apakah import ini leftover?

### src/routes/(app)/dashboard/+page.svelte
- `authState` digunakan untuk `Authorization: *** ${authState.token}` - VALID
- `fly` transition digunakan - VALID

## Production Console Statements (acceptable - using console.error)
Berikut console statements yang dibiarkan karena penting untuk debugging produksi:
- `sync.svelte.ts:58` - `console.error('Sync failed:', error)` - penting untuk monitoring
- `sync.svelte.ts:85,88` - error handling
- `sync.svelte.ts:129` - network error
- `printer.ts:26,66` - printer connection errors
- `appMode.svelte.ts:23` - preference save error
- Various `.catch(console.error)` patterns
- Various route-level `console.error(e)` untuk error handling

## Deleted (Confirmed Dead Code)
- `src/lib/components/dashboard/ActionTile.svelte` - orphan, tidak di-import dimanapun

## Fixed Imports
- `src/routes/(app)/dashboard/+page.svelte` - removed unused `logout`, `goto`, `appModeState`
- `src/lib/components/pos/ProductGrid.svelte` - removed unused `animate` import

## Removed Console.log
- `src/lib/stores/sync.svelte.ts` - removed `console.log` di lines 83, 126 (debug noise)

---
Generated: 2024-08-08
