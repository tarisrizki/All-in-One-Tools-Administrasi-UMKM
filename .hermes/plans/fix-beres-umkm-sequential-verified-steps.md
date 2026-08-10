# Fix Beres UMKM — Sequential, Verified Steps

## Context
Repo `umkm-audit`, Hono + SvelteKit 5 + Supabase + Tauri + Flutter.
4 step berurutan, stop jika verifikasi fail.

## Step 1 — .env VITE_* (root cause supabase null)
- `frontend/.env` isi `VITE_SUPABASE_URL=https://mtruylleduthzqjtmqzf.supabase.co` + `VITE_SUPABASE_ANON_KEY` dashboard > Settings > API (verify not committed, git check-ignore)
- restart dev `bun --cwd frontend run dev` env cached
- verify `console.log(import.meta.env.VITE_SUPABASE_URL)` via camoufox `page.evaluate` harus URL bukan undefined
- gate: STOP jika undefined

## Step 2 — Wire orders.ts.bak → orders.ts
- `mv backend-workers/src/modules/orders.ts.bak orders.ts` review `convert_order_to_sale` `db.transaction(async tx=>...)` atomic
- `backend-workers/src/index.ts` mount `app.route('/orders', ordersModule)` pola module lain
- verify `bun --cwd backend-workers x tsc --noEmit` 0 errors (dengan orders included, tidak as any hide)
- verify endpoint `/orders` POST/GET TypedResponse

## Step 3 — Fix sync 23505 → 200 duplicate_ignored
- `backend-workers/src/modules/sync.ts` catch `err.code==='23505'` return `duplicate_ignored 200` (sales/cashbook jika ada UNIQUE client_transaction_id)
- verify `bun x vitest run test/sync.test.ts` push idem same id 200 kedua, status `duplicate_ignored` + full `bun test` idor/opname/sync PASS

## Step 4 — Migrate Supabase
- diff `ws-05-orders-lifecycle.sql` vs `orders.ts` columns match
- `supabase db push` smoke create order via API cek dashboard RLS token business

## Verification
bun tsc 0, svelte-check 0, vitest 28, playwright 7 list, supabase null resolved
