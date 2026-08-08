# Dead Code Report

Scan date: 2025-08-08
Scanned directories: `backend-workers/src`, `frontend/src`
Total files scanned: 168

---

## Orphan Files

*Tidak ada orphan files yang dikonfirmasi.*

Analisis:
- File `printer.ts` mengekspor `thermalPrinter` yang digunakan di `ReceiptModal.svelte` dan `PrinterCard.svelte`
- Store files (`appMode.svelte.ts`, `sync.svelte.ts`, dll) digunakan via SvelteKit auto-discovery
- UI components di-import via index barrel files
- SvelteKit routes (+page.svelte, +layout.svelte) adalah entry points

---

## Unused Imports

*Tidak ada temuan yang memerlukan aksi.*

Import analysis dilakukan per-file. Import berikut ditemukan tapi bukan dead code:
- `ClassValue` di `frontend/src/lib/utils.ts:1` - digunakan sebagai type annotation untuk function `cn()`
- `getApiUrl` di `frontend/src/lib/stores/sync.svelte.ts:1` - **TELAH DIHAPUS** (confirmed unused)

---

## Dead Variables

- `frontend/src/lib/components/CommandPalette.svelte:121`: `flatIdx`
  - **TELAH DIHAPUS** - Declared but never used; line 155 menggunakan `flatList().indexOf(item)` instead

---

## Debug/Console

*Konsol log yang ditemukan adalah intentional, bukan dead code:*

### Backend (Production Monitoring)
- `backend-workers/src/index.ts:115`: `console.log('Cron trigger...')`
- `backend-workers/src/index.ts:129`: `console.log('Mulai proses...')`
- `backend-workers/src/index.ts:182`: `console.log('Mulai backup...')`
- `backend-workers/src/index.ts:246`: `console.log('Selesai backup...')`
- `backend-workers/src/index.ts:270`: `console.log('Proses cron backup berhasil...')`

**Alasan**: Log ini untuk monitoring cron job di production (Cloudflare Workers). Tidak dihapus karena penting untuk debugging production issues.

### Frontend (Sync Debugging)
- `frontend/src/lib/stores/sync.svelte.ts:83`: `console.log('Successfully synced...')`
- `frontend/src/lib/stores/sync.svelte.ts:126`: `console.log('Pulled...products')`

**Alasan**: Debug logging untuk sync operations. Pertimbangkan untuk menambahkan `if (import.meta.env.DEV)` wrapper di masa depan.

---

## TODOs

*Tidak ada temuan.*

Scan untuk TODO/FIXME/HACK menunjukkan:
- Semua `[NOTE]` comments yang ditemukan adalah placeholder markers untuk schema fields (zod nullable/optional patterns), bukan actual TODO items
- Tidak ada TODO/FIXME/HACK yang memerlukan aksi

---

## Summary

| Category | Found | Fixed |
|----------|-------|-------|
| Orphan Files | 0 | 0 |
| Unused Imports | 1 | 1 |
| Dead Variables | 1 | 1 |
| Debug/Console | 9 | 0 (intentional) |
| TODOs | 0 | 0 |

### Files Modified
1. `frontend/src/lib/components/CommandPalette.svelte` - Removed unused `flatIdx` variable
2. `frontend/src/lib/stores/sync.svelte.ts` - Removed unused `getApiUrl` import
