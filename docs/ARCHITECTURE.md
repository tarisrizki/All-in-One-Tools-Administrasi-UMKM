# Arsitektur Aplikasi UMKM Audit

## Gambaran Umum Sistem

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser / PWA)                              │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────────────────────┐ │
│  │  SvelteKit SPA  │   │  Service Worker  │   │       IndexedDB (Dexie)       │ │
│  │  (Frontend App) │   │  (Asset Cache)   │   │  • products                    │ │
│  │                 │   │                  │   │  • categories                  │ │
│  │  Svelte Stores  │   │  Cache app shell │   │  • customers                   │ │
│  │  auth.svelte.ts │   │  & static assets │   │  • pending_transactions         │ │
│  │  sync.svelte.ts │   │                  │   │                                │ │
│  └────────┬────────┘   └──────────────────┘   └───────────────┬────────────────┘ │
│           │                                                 ▲                     │
│           │  apiClient() dengan JWT                           │                     │
│           │  (auto-refresh 401 → token baru)                 │ pushPendingTx()     │
│           │                                                 │ bulkPut()           │
└───────────┼─────────────────────────────────────────────────┼─────────────────────┘
            │                                                 │
            ▼                                                 │
┌─────────────────────────────────────────────────────────────▼─────────────────────┐
│                          CLOUDFLARE WORKERS (Hono + TypeScript)                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                            API Routes (OpenAPI Hono)                         │  │
│  │                                                                              │  │
│  │  ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌─────────────┐   │  │
│  │  │ /auth/* │ │ /sales │ │ /sync  │ │ /products│ │/reports│ │  /modules/* │   │  │
│  │  │ register│ │  POST  │ │  POST  │ │  (CRUD) │ │        │ │  (CRUD ops) │   │  │
│  │  │ login   │ │  GET   │ │  GET   │ │         │ │        │ │             │   │  │
│  │  │ refresh │ │        │ │        │ │         │ │        │ │             │   │  │
│  │  │ logout  │ │        │ │        │ │         │ │        │ │             │   │  │
│  │  └────┬─────┘ └────┬──┘ └───┬────┘ └────┬────┘ └────────┘ └──────┬──────┘   │  │
│  │       │            │        │          │                        │          │  │
│  │       └────────────┴────────┴──────────┴────────────────────────┘          │  │
│  │                                      │                                        │  │
│  │                           ┌──────────▼──────────┐                           │  │
│  │                           │  authMiddleware()    │                           │  │
│  │                           │  ──────────────────   │                           │  │
│  │                           │  verify(JWT)         │                           │  │
│  │                           │  inject: businessId   │                           │  │
│  │                           │         userId        │                           │  │
│  │                           │         roleId        │                           │  │
│  │                           └──────────┬──────────┘                           │  │
│  └──────────────────────────────────────┼───────────────────────────────────────┘  │
│                                          │                                           │
│  ┌───────────────────────────────────────▼───────────────────────────────────────┐  │
│  │                            getSupabase(c.env)                                 │  │
│  │                                                                               │  │
│  │    Supabase URL         ┌──────────────────────────┐    Service Role Key     │  │
│  │  ──────────────────────▶│  createClient() via     │◀─────────────────────── │  │
│  │                         │  @supabase/supabase-js  │                         │  │
│  │                         │                         │                         │  │
│  │                         │  • BYPASSES RLS         │                         │  │
│  │                         │  • Bypasses RLS karena   │                         │  │
│  │                         │    service_role key      │                         │  │
│  │                         │  • Semua query HARUS    │                         │  │
│  │                         │    menyertakan           │                         │  │
│  │                         │    .eq('business_id',    │                         │  │
│  │                         │     businessId)          │                         │  │
│  │                         └────────────┬────────────┘                         │  │
│  └──────────────────────────────────────┼───────────────────────────────────────┘  │
└──────────────────────────────────────────┼───────────────────────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                   SUPABASE POSTGRES                                    │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Row Level Security (RLS)                            │  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  "User Business Scope" Policy — untuk user yang login via JWT frontend:    │  │  │
│  │  │                                                                             │  │  │
│  │  │  USING (business_id IN (                                                  │  │  │
│  │  │    SELECT business_id FROM users WHERE id = current_setting('request.jwt│  │  │
│  │  │  .sub')::uuid                                                             │  │  │
│  │  │  ))                                                                       │  │  │
│  │  │                                                                             │  │  │
│  │  │  ✗ Anon/anon key: DITOLAK (tidak ada access)                              │  │  │
│  │  │  ✓ service_role key: LULUS (bypasses RLS)                                  │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  "Service Role Full Access" Policy — backend workers bypass:               │  │  │
│  │  │  CREATE POLICY ... TO service_role USING (true) WITH CHECK (true)         │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │    businesses    │  │      users       │  │    products      │  │    sales       │ │
│  │ ──────────────── │  │ ──────────────── │  │ ──────────────── │  │ ────────────── │ │
│  │ id               │  │ id               │  │ id               │  │ id             │ │
│  │ name             │  │ business_id (FK) │  │ business_id (FK) │  │ business_id(FK)│ │
│  │ settings (jsonb) │  │ role_id (FK)      │  │ category_id (FK)  │  │ warehouse_id   │ │
│  │                  │  │ name              │  │ name / sku / ...  │  │ client_tx_id   │ │
│  │                  │  │ phone             │  │ sell_price        │  │ invoice_number │ │
│  │                  │  │ password_hash     │  │ stock             │  │ grand_total    │ │
│  │                  │  │ is_active         │  │                   │  │ status         │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │    categories    │  │    customers     │  │  product_stock   │  │   payments     │ │
│  │ ──────────────── │  │ ──────────────── │  │ ──────────────── │  │ ────────────── │ │
│  │ id               │  │ id               │  │ product_id (FK)   │  │ sale_id (FK)   │ │
│  │ business_id (FK) │  │ business_id (FK) │  │ warehouse_id (FK) │  │ method         │ │
│  │ name             │  │ name             │  │ quantity          │  │ amount         │ │
│  └──────────────────┘  │ loyalty_points   │  │ UNIQUE(p,w)      │  └────────────────┘ │
│                         └──────────────────┘  └──────────────────┘                   │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │                         Stored Procedures (SECURITY DEFINER)                    │ │
│  │                                                                                  │ │
│  │  process_sale() — Atomic transaction:                                           │ │
│  │    1. Cek idempotency (client_transaction_id UNIQUE)                            │ │
│  │    2. INSERT sale header + sale_items                                           │ │
│  │    3. SELECT ... FOR UPDATE product_stock (row lock, prevetn oversell)          │ │
│  │    4. UPDATE product_stock (quantity -= qty)                                     │ │
│  │    5. INSERT payments                                                           │ │
│  │    6. INSERT debts (piutang) jika belum lunas                                   │ │
│  │    7. UPDATE customers (loyalty points)                                          │ │
│  │    8. RETURN {id, status, duplicate}                                             │ │
│  │                                                                                  │ │
│  │  receive_purchase_order() — Atomic: PO status + stock increment                 │ │
│  │  pay_debt() — Atomic: debt payment + remaining_amount check                     │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Alur Autentikasi (Authentication Flow)

### 1.1 Register (Pendaftaran Pertama)

```
Browser                          Cloudflare Workers                  Supabase DB
  │                                      │                               │
  │ POST /auth/register                 │                               │
  │ { phone, password,                  │                               │
  │   businessName,                     │                               │
  │   cfTurnstileResponse }             │                               │
  │─────────────────────────────────────▶                               │
  │                                      │                               │
  │                                      │ Verify Turnstile token         │
  │                                      │ (Cloudflare Challenge API)      │
  │                                      │────────────────────────────────▶
  │                                      │                               │
  │                                      │ SELECT * FROM users            │
  │                                      │  WHERE phone = $1              │
  │                                      │────────────────────────────────▶
  │                                      │                               │
  │                                      │ INSERT businesses {...}         │
  │                                      │────────────────────────────────▶
  │                                      │                               │
  │                                      │ INSERT users {                 │
  │                                      │   business_id: NEW_BUSINESS.id, │
  │                                      │   role_id: OWNER_ROLE.id,      │
  │                                      │   password_hash: HASH(password)│
  │                                      │ }                               │
  │                                      │────────────────────────────────▶
  │                                      │                               │
  │                                      │ INSERT warehouses              │
  │                                      │  (default warehouse)           │
  │                                      │────────────────────────────────▶
  │                                      │                               │
  │                                      │ INSERT categories              │
  │                                      │  (kategori default)            │
  │                                      │────────────────────────────────▶
  │                                      │                               │
  │                                      │ sign(                          │
  │                                      │   { userId, businessId,        │
  │                                      │     roleId, type:'access',     │
  │                                      │     exp: now+8h }, JWT_SECRET)  │
  │                                      │ sign(                          │
  │                                      │   { userId, businessId,        │
  │                                      │     roleId, type:'refresh',    │
  │                                      │     exp: now+30d }, JWT_SECRET)  │
  │                                      │                               │
  │ { success: true,                    │                               │
  │   token: ACCESS_JWT,                │                               │
  │   refreshToken: REFRESH_JWT,        │                               │
  │   permissions: ['*'] }              │                               │
  │◀─────────────────────────────────────│                               │
  │                                      │                               │
  │ Simpan ke localStorage:              │                               │
  │   umkm_token                         │                               │
  │   umkm_refresh_token                │                               │
  │   umkm_user                         │                               │
```

**Catatan Keamanan:**
- Password di-hash dengan bcrypt sebelum disimpan (`hashPassword`)
- Turnstile (CAPTCHA Cloudflare) wajib untuk mencegah bot register
- Refresh token TTL: 30 hari, Access token TTL: 8 jam

### 1.2 Login

```
Browser                          Cloudflare Workers                  Supabase DB
  │                                      │                               │
  │ POST /auth/login                     │                               │
  │ { phone, password }                  │                               │
  │─────────────────────────────────────▶                               │
  │                                      │                               │
  │                                      │ SELECT users.*,              │
  │                                      │        businesses(settings),  │
  │                                      │        roles(permissions)    │
  │                                      │ FROM users                   │
  │                                      │ JOIN businesses              │
  │                                      │ JOIN roles                   │
  │                                      │ WHERE phone = $1             │
  │                                      │────────────────────────────────▶
  │                                      │                               │
  │                                      │ verifyPassword(password,      │
  │                                      │   user.password_hash)          │
  │                                      │                               │
  │                                      │ sign(ACCESS_JWT)  // 8h       │
  │                                      │ sign(REFRESH_JWT) // 30d      │
  │                                      │                               │
  │ { success: true,                    │                               │
  │   token, refreshToken,              │                               │
  │   permissions, app_mode }           │                               │
  │◀─────────────────────────────────────│                               │
```

### 1.3 Token Refresh (Otomatis + Interceptor)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        apiClient() Token Interceptor                         │
│                                                                               │
│   request = fetch(url, headers + JWT)                                        │
│                                                                               │
│   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐   │
│   │ response.status │────▶│ 401?             │────▶│ tryRefreshToken()│   │
│   │ == 200 OK       │     │ + refreshToken   │     │                  │   │
│   └──────────────────┘     │ exists?         │     │ POST /auth/refresh│   │
│         │                  └────────┬─────────┘     │ {refresh_token}   │   │
│         │                           │               └────────┬─────────┘   │
│         ▼                           ▼                        │               │
│   ┌──────────┐            ┌──────────────┐    ┌───────────▼──────────┐   │
│   │  return  │            │ fetch(url,    │    │ { token: NEW_JWT }   │   │
│   │  data    │            │ headers+JWT) │    │ setAuth(NEW_JWT, ...)│   │
│   └──────────┘            └───────┬───────┘    └─────────────────────┘   │
│                                   │                                           │
│                                   ▼                                           │
│                          ┌────────────────┐                                 │
│                          │ response.status │                                 │
│                          │ == 401 lagi?   │──── logout() + redirect login   │
│                          └────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Debounce refresh:** `refreshPromise` singleton mencegah multiple concurrent refresh
- **Auto-refresh:** `tryRefreshToken()` dipanggil otomatis saat `apiClient()` menerima 401
- **Logout on 401:** Jika refresh gagal, langsung logout dan redirect ke `/auth/login`

---

## 2. Alur POS (Point of Sale Flow)

### 2.1 Online — Langsung ke RPC

```
Kasir (Browser)           Cloudflare Workers              Supabase RPC              Supabase DB
    │                           │                               │                        │
    │ POST /sales/              │                               │                        │
    │ { items, payments,        │                               │                        │
    │   clientTransactionId,    │                               │                        │
    │   customerId? }           │                               │                        │
    │ authMiddleware(JWT)        │                               │                        │
    │ inject: businessId         │                               │                        │
    │ requirePermission()        │                               │                        │
    │───────────────────────────▶                               │                        │
    │                           │                               │                        │
    │                           │ SELECT id FROM warehouses    │                        │
    │                           │  WHERE business_id=$1         │                        │
    │                           │   AND is_default=true         │                        │
    │                           │────────────────────────────────────────────────────────▶
    │                           │                               │                        │
    │                           │ ─── stock validation ───     │                        │
    │                           │ SELECT id FROM products       │                        │
    │                           │  WHERE business_id=$1         │                        │
    │                           │   AND id IN (...)              │                        │
    │                           │────────────────────────────────────────────────────────▶
    │                           │                               │                        │
    │                           │                               │ CALL process_sale(    │
    │                           │                               │   p_business_id,       │
    │                           │                               │   p_warehouse_id,      │
    │                           │                               │   p_client_tx_id,      │
    │                           │                               │   p_items,             │
    │                           │                               │   p_payments, ...      │
    │                           │                               │ )                      │
    │                           │                               │───────────────────────▶
    │                           │                               │                        │
    │                           │                               │ ┌─── BEGIN ──────────┐ │
    │                           │                               │ │  1. Idempotency    │ │
    │                           │                               │ │     cek client_tx_id│ │
    │                           │                               │ │  2. INSERT sales   │ │
    │                           │                               │ │  3. INSERT items   │ │
    │                           │                               │ │  4. FOR UPDATE     │ │
    │                           │                               │ │     stock lock      │ │
    │                           │                               │ │  5. UPDATE stock   │ │
    │                           │                               │ │  6. INSERT payment │ │
    │                           │                               │ │  7. INSERT debt    │ │
    │                           │                               │ │     (if partial)   │ │
    │                           │                               │ │  8. UPDATE loyalty │ │
    │                           │                               │ │  COMMIT            │ │
    │                           │                               │ └── RETURN {...} ────┘ │
    │                           │                               │                        │
    │ { success: true,         │                               │                        │
    │   data: { id, status } } │                               │                        │
    │◀──────────────────────────│                               │                        │
    │                           │                               │                        │
    │ Print struk / notifikasi  │                               │                        │
```

### 2.2 Idempotency Protection

`client_transaction_id` (UUID v4 yang digenerate di client) bertindak sebagai **idempotency key**:

1. Client generate UUID saat kasir menekan "Bayar"
2. Jika tombol ditekan 2x / request dikirim ulang, server mendeteksi `client_transaction_id` yang sama
3. RPC `process_sale()` mengembalikan `{ duplicate: true, id: EXISTING_ID }` tanpa memproses lagi
4. Client menerima success dan menampilkan hasil transaksi pertama

---

## 3. Alur Offline Sync (Dexie → Sync Push → RPC)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    OFFLINE SCENARIO                                     │
│                                                                                        │
│  Kasir melakukan transaksi saat tidak ada koneksi internet                             │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           DEXIE (IndexedDB)                                       │  │
│  │                                                                                   │  │
│  │  pending_transactions table:                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ client_transaction_id │ businessId │ grandTotal │ items │ payments │ createdAt │  │  │
│  │  │───────────────────────┼────────────┼────────────┼───────┼──────────┼──────────│  │  │
│  │  │ uuid-xxx-1            │ biz_123    │ 150000     │ [...] │ [...]    │ 10:30:15 │  │  │
│  │  │ uuid-xxx-2            │ biz_123    │  75000     │ [...] │ [...]    │ 10:45:22 │  │  │
│  │  │ uuid-xxx-3            │ biz_123    │ 220000     │ [...] │ [...]    │ 11:02:01 │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                                │
│  db.pending_transactions.add({         │  [Browser / Dexie write]                       │
│    client_transaction_id,              │                                                │
│    businessId,                         │                                                │
│    items,                              │                                                │
│    payments,                           │                                                │
│    grandTotal, ...                     │                                                │
│  })                                   │                                                │
│                                       ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           POS UI (SvelteKit)                                      │  │
│  │                                                                                   │  │
│  │  • Transaksi tetap tercatat lokal                                                 │  │
│  │  • Struk bisa di-print langsung (browser.print / thermal printer)                 │  │
│  │  • Notifikasi: "Transaksi tersimpan offline, akan sync saat online"               │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SYNC TRIGGER                                             │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                     initSyncManager()                                             │  │
│  │                                                                                   │  │
│  │  window.addEventListener('online',  () => triggerSync())                          │  │
│  │  window.addEventListener('offline', () => { isOnline = false })                 │  │
│  │                                                                                   │  │
│  │  setInterval(() => {              // setiap 5 menit                              │  │
│  │    if (isOnline && isAuthenticated) triggerSync()                                 │  │
│  │  }, 5 * 60 * 1000)                                                               │  │
│  │                                                                                   │  │
│  │  triggerSync() — manual call saat user login / browser restore                   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SYNC FLOW                                                 │
│                                                                                        │
│                           triggerSync()                                                │
│                                 │                                                      │
│                    ┌───────────┴───────────┐                                         │
│                    │  isOnline?            │                                         │
│                    │  isSyncing?           │                                         │
│                    │  isAuthenticated?     │                                         │
│                    └───────────┬───────────┘                                         │
│                                │                                                      │
│                                ▼                                                      │
│                    ┌───────────────────────┐                                          │
│                    │ pushPendingTransactions│                                         │
│                    └───────────┬───────────┘                                          │
│                                │                                                      │
│                    ┌───────────▼───────────┐                                          │
│                    │ 1. db.pending_tx     │                                          │
│                    │    .toArray()         │  [Dexie → IndexedDB]                     │
│                    │                      │                                          │
│                    │ 2. POST /sync/push    │                                          │
│                    │    Authorization:     │                                          │
│                    │    Bearer {JWT}       │                                          │
│                    │    Body: {            │                                          │
│                    │      transactions: [  │                                          │
│                    │        { client_tx_id, │                                          │
│                    │          items,        │                                          │
│                    │          payments, ... │                                          │
│                    │        }, ...          │                                          │
│                    │      ]                │                                          │
│                    │    }                  │                                          │
│                    │───────────────────────▶│                                          │
│                    │                      │                                          │
│                    │                      │ ┌──────────────────────────────────────┐  │
│                    │                      │ │  Cloudflare Workers                  │  │
│                    │                      │ │                                      │  │
│                    │                      │ │  authMiddleware(JWT)                 │  │
│                    │                      │ │  GET warehouses (default)            │  │
│                    │                      │ │                                      │  │
│                    │                      │ │  for each transaction:               │  │
│                    │                      │ │    validate product ownership         │  │
│                    │                      │ │    generate invoice_number           │  │
│                    │                      │ │    CALL process_sale() RPC           │  │
│                    │                      │ │      • idempotency check (client_tx_id)│  │
│                    │                      │ │      • stock lock + decrement        │  │
│                    │                      │ │      • INSERT payments               │  │
│                    │                      │ │      • INSERT debt (if partial)       │  │
│                    │                      │ │                                      │  │
│                    │                      │ │  return: { success, failed[] }       │  │
│                    │                      │ └──────────────────────────────────────┘  │
│                    │◀──────────────────────│                                          │
│                    │                      │                                          │
│                    │ 3. if (res.success):  │                                          │
│                    │    db.pending_tx      │                                          │
│                    │    .bulkDelete(ids)   │  [Dexie cleanup]                        │
│                    │                      │                                          │
│                    └───────────┬───────────┘                                          │
│                                │                                                      │
│                                ▼                                                      │
│                    ┌───────────────────────┐                                          │
│                    │  pullLatestData()       │                                          │
│                    └───────────┬───────────┘                                          │
│                                │                                                      │
│                    ┌───────────▼───────────┐                                          │
│                    │ GET /sync/pull        │                                          │
│                    │ ?since={lastUpdated}  │                                          │
│                    │──────────────────────▶│                                          │
│                    │                      │                                          │
│                    │                      │ SELECT products, categories, customers  │
│                    │                      │  WHERE business_id = $1                 │
│                    │                      │    AND updated_at > since               │
│                    │                      │─────────────────────────────────────────▶
│                    │                      │                                          │
│                    │ { success, data:     │                                          │
│                    │   { products,         │                                          │
│                    │     categories,        │                                          │
│                    │     customers } }      │                                          │
│                    │◀──────────────────────│                                          │
│                    │                      │                                          │
│                    │ 4. db.products.bulkPut()                                        │
│                    │    db.categories.bulkPut()   [Dexie update local cache]          │
│                    │    db.customers.bulkPut()                                       │
│                    │                      │                                          │
│                    │ 5. lastSyncTime = new Date()                                     │
│                    │                      │                                          │
│                    └───────────────────────┘                                          │
```

### 3.1 Conflict Resolution Strategy

| Scenario | Handling |
|----------|----------|
| **Same `client_transaction_id` double-push** | RPC idempotent — return `{ duplicate: true }`, client treats as success |
| **Stock negatif (race condition)** | `FOR UPDATE` row lock di PostgreSQL → transaksi ditolak dengan error |
| **Produk di-hapus dari server** | Validasi `product_ids` ownership di backend → transaksi gagal jika produk tidak valid |
| **Partial payment conflict** | `client_transaction_id` = deterministic key, idempotent |

### 3.2 Service Worker Cache Strategy

```
Service Worker (frontend/src/service-worker.ts)

  GET request:
  ┌─────────────────────────────────────────┐
  │  ASSETS (build/files)?                  │
  │  ├── YES → cache.match → return       │
  │  │              (stale-while-revalidate)│
  │  │                                    │
  │  └── NO → fetch() → network first     │
  │                │                       │
  │                ├─ 200 → cache.put()    │
  │                │     return response  │
  │                │                       │
  │                └─ catch → cache.match() │
  │                          (fallback)     │
  │                          └─ 503 Offline│
  └─────────────────────────────────────────┘

  POST request: PASS THROUGH (tidak di-cache)
```

---

## 4. Model Keamanan (Security Model)

### 4.1 RLS Policies Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   RLS ARCHITECTURE                                       │
│                                                                                         │
│   ┌───────────────────────┐                                                            │
│   │  JWT from frontend     │  Setiap request dari browser menyertakan Bearer JWT        │
│   │  Bearer {token}         │  yang berisi: userId, businessId, roleId                  │
│   │  (8-hour access token) │                                                            │
│   └───────────┬───────────┘                                                            │
│               │                                                                        │
│               ▼                                                                        │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           Supabase Row Level Security                             │  │
│   │                                                                                   │  │
│   │   Policy: "User Business Scope"                                                   │  │
│   │   ───────────────────────────────────────────────────────────────────────────     │  │
│   │                                                                                   │  │
│   │   -- Contoh untuk tabel products:                                                 │  │
│   │   CREATE POLICY "User Business Scope" ON products                                  │  │
│   │   FOR ALL                                                                          │  │
│   │   USING (                                                                           │  │
│   │     business_id IN (                                                               │  │
│   │       SELECT business_id FROM users                                               │  │
│   │       WHERE id = current_setting('request.jwt.sub')::uuid                          │  │
│   │     )                                                                              │  │
│   │   );                                                                               │  │
│   │                                                                                   │  │
│   │   ✗ Jika tidak ada JWT / JWT invalid → ERROR                                      │  │
│   │   ✗ Jika JWT valid tapi business_id berbeda → ERROR                                │  │
│   │   ✓ Jika JWT valid + business_id match → ACCESS GRANTED                           │  │
│   │                                                                                   │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │  Policy: "Service Role Full Access"                                                │  │
│   │  ───────────────────────────────────────────────────────────────────────────      │  │
│   │                                                                                   │  │
│   │   CREATE POLICY "Service Role Full Access" ON products                            │  │
│   │   FOR ALL TO service_role USING (true) WITH CHECK (true);                         │  │
│   │                                                                                   │  │
│   │   ✓ service_role key BYPASSES semua RLS policy                                    │  │
│   │   ✓ Digunakan OLEH backend Workers SAJA (bukan dari browser)                     │  │
│   │   ✓ RLS tetap berlajan untuk semua user-facing query                             │  │
│   │                                                                                   │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Defense Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SECURITY STACK                                   │
│                                                                             │
│  Layer 1: Network Level                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Cloudflare Workers: DDoS protection, WAF rules                         │
│  • HTTPS only (TLS 1.3 enforced)                                           │
│  • CORS policy: only allowed origins                                       │
│                                                                             │
│  Layer 2: Application Level                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • authMiddleware: JWT signature verification (HS256)                     │
│  • requirePermission(): RBAC check sebelum operasi                        │
│  • Input validation: Zod schemas di setiap route                         │
│  • Rate limiting: middleware/rateLimit.ts                                 │
│  • Turnstile CAPTCHA: register endpoint only                              │
│                                                                             │
│  Layer 3: Database Level                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • RLS "User Business Scope": user hanya lihat data BISNISNYA            │
│  • RLS "Service Role Full Access": backend bypass dengan guard           │
│  • SECURITY DEFINER stored procedures: atomic operations                   │
│  • FOR UPDATE row lock: prevent race conditions                          │
│  • Foreign key constraints: referential integrity                         │
│                                                                             │
│  Layer 4: Data Level                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Password hash: bcrypt (tidak plaintext)                                 │
│  • business_id filter: wajib di SEMUA query (backend)                     │
│  • UUID instead of sequential IDs: tidak bisa di-enumerate                 │
│  • Idempotency keys: mencegah replay attacks                              │
│                                                                             │
│  Layer 5: Permission Matrix                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Role     │ pos.read │ pos.write │ products.* │ reports.* │ settings.*    │
│  ─────────┼──────────┼───────────┼────────────┼───────────┼─────────────  │
│  owner    │    ✓     │     ✓     │     ✓      │     ✓     │      ✓        │
│  admin    │    ✓     │     ✓     │     ✓      │     ✓     │      ✓        │
│  cashier  │    ✓     │     ✓     │     ✗      │     ✓     │      ✗        │
│                                                                             │
│  hasPermission() evaluation:                                                │
│    1. ['*'] wildcard → ALLOW (owner/admin)                               │
│    2. exact match → ALLOW                                                 │
│    3. base module match ('products' covers 'products.read') → ALLOW       │
│    4. else → DENY                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 JWT Payload Structure

```json
// Access Token (8 jam)
{
  "userId": "uuid-xxxx",
  "businessId": "uuid-yyyy",
  "roleId": "uuid-zzzz",
  "type": "access",
  "exp": 1234567890,
  "iat": 1234567890
}

// Refresh Token (30 hari)
{
  "userId": "uuid-xxxx",
  "businessId": "uuid-yyyy",
  "roleId": "uuid-zzzz",
  "type": "refresh",
  "exp": 1234567890,
  "iat": 1234567890
}
```

**Environment Variables yang Diperlukan di Cloudflare Workers:**

| Variable | Fungsi |
|----------|--------|
| `SUPABASE_URL` | URL Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only, tidak boleh ke browser) |
| `JWT_SECRET` | Secret untuk sign/verify JWT |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile verification |
| `WA_API_KEY` | WhatsApp API untuk kirim struk (opsional) |

---

## 5. Data Flow Summary

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     COMPLETE DATA FLOW                                      │
│                                                                                            │
│  ┌─ ONLINE ─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                                        │ │
│  │  Svelte Component                                                                      │ │
│  │       │                                                                                │ │
│  │       │ apiClient('/sales', { method: 'POST', body, JWT })                           │ │
│  │       ▼                                                                                │ │
│  │  Cloudflare Worker                                                                       │ │
│  │       │ authMiddleware → inject {businessId, userId, roleId}                         │ │
│  │       │ requirePermission('pos.write')                                                │ │
│  │       │ getSupabase(env) → service_role client (bypasses RLS)                         │ │
│  │       │                                                                                 │ │
│  │       │ // WAJIB: seluruh query menyertakan business_id                               │ │
│  │       │ supabase.from('products').select('*').eq('business_id', businessId)          │ │
│  │       │                                                                                 │ │
│  │       │ supabase.rpc('process_sale', { ..., p_business_id: businessId })             │ │
│  │       │                                                                                 │ │
│  │       ▼                                                                                │ │
│  │  Supabase PostgreSQL (RLS aktif)                                                       │ │
│  │       │ service_role key → bypass RLS                                                 │ │
│  │       │ BUSINESS-ID FILTER → diterapkan DI DALAM stored procedure                    │ │
│  │       │                                                                                 │ │
│  │       │ process_sale() atomic transaction:                                             │ │
│  │       │   INSERT sale → INSERT items → UPDATE stock → INSERT payment                 │ │
│  │       │                                                                                 │ │
│  └────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│  ┌─ OFFLINE ────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                                        │ │
│  │  Kasir tekan "Bayar" saat offline                                                      │ │
│  │       │                                                                                │ │
│  │       │ clientTransactionId = crypto.randomUUID()                                     │ │
│  │       ▼                                                                                │ │
│  │  Dexie (IndexedDB)                                                                       │ │
│  │       │ db.pending_transactions.add({ clientTransactionId, items, payments, ... })    │ │
│  │       ▼                                                                                │ │
│  │  UI update: "Transaksi tersimpan offline"                                             │ │
│  │       │                                                                                │ │
│  │       │ [Koneksi pulih]                                                                │ │
│  │       ▼                                                                                │ │
│  │  triggerSync()                                                                         │ │
│  │       │                                                                                 │ │
│  │       │ pushPendingTransactions()                                                      │ │
│  │       │ POST /sync/push → Cloudflare Worker → RPC process_sale()                       │ │
│  │       │   (idempotent: duplicate check via client_transaction_id)                    │ │
│  │       │                                                                                 │ │
│  │       │ pullLatestData()                                                               │ │
│  │       │ GET /sync/pull?since={lastSync} → products/categories/customers terbaru      │ │
│  │       │   db.products.bulkPut(...) // update local cache                               │ │
│  │       │                                                                                 │ │
│  │       │ db.pending_transactions.bulkDelete(ids) // cleanup local queue                 │ │
│  └────────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Key Design Decisions

| Decision | Alasan |
|----------|--------|
| **JWT custom (bukan Supabase Auth)** | Workers perlu `businessId` + `roleId` di dalam token tanpa extra roundtrip ke Supabase |
| **Service role key di Workers** | Workers bypasses RLS tapi WAJIB filter `business_id` manual di setiap query |
| **Dexie untuk offline storage** | IndexedDB wrapper dengan API promise-based,lebih ergonomis dari raw IDB |
| **Atomic RPC (`process_sale`)** | Mencegah partial writes: transaksi gagal → tidak ada stock deduction |
| **`FOR UPDATE` row lock** | Mencegah oversell saat 2 kasir checkout produk yang sama secara bersamaan |
| **`client_transaction_id` idempotency** | UUID dari client → proteksi double-submit, offline retry, dan race condition |
| **Sync pull (bukan real-time)** | Cost-efficient, cocok untuk use case POS retail |
| **Service Worker untuk asset cache** | App shell caching → pengalaman offline-first untuk UI shell |

---

## 6. Roadmap Fitur (Set Fitur Qasir)

Arah pengembangan mengacu pada set fitur Qasir (aplikasi kasir UMKM terlengkap). Dibagi 6 kelompok:

### 6.1 Sistem Kasir POS
- Kasir multi-perangkat (smartphone, tablet, desktop, dual screen)
- Pembayaran digital QRIS
- Cetak struk bukti pembayaran
- Pajak per produk (kolom `tax_percent` di `products`)
- Kasbon dengan cicilan (sudah ada: `debts` + `debt_payments`)
- Tipe order + biaya layanan per tipe (tabel `order_types`)
- Status order (sudah ada: `sales.status`)
- Cetak tiket pesanan pelanggan
- Atur tampilan struk (template struk)
- Pengaturan meja (tabel `tables`)
- Uang muka pre-order (`sales.down_payment`)
- Label pembayaran sesuai jenis transaksi
- Nomor antrian pelanggan

### 6.2 Inventori Produk
- Kelola produk (sudah ada: `products`)
- Kelola stok (sudah ada: `product_stock` + warehouse)
- Export & ubah produk sekaligus (bulk import/export)
- Kelola bahan baku (tabel `ingredients` / recipe)
- Pengaturan harga modal (sudah ada: `products.cost_price`)
- Kelola harga grosir (tabel `wholesale_prices`)
- Pengingat kedaluarsa produk (`products.expiry_date`)

### 6.3 Laporan
- Laporan penjualan (sudah ada: `/reports/sales`)
- Periode akses laporan (filter date range)
- Laporan perputaran stok (tabel `stock_movements`)

### 6.4 Kelola Outlet
- Outlet utama (sudah ada: `businesses` / `warehouses`)
- Outlet cabang (`outlets` tabel, stok & laporan per outlet)

### 6.5 Pegawai
- Akses pegawai (sudah ada: `users` + `roles`)
- Otorisasi pegawai (sudah ada: `roles.permissions`)
- Absensi pegawai (tabel `attendance`)
- Tugaskan pegawai ke transaksi tertentu (`sales.created_by`)

### 6.6 Strategi Bisnis
- Kelola diskon (sudah ada: `sale_items.discount`)
- Poin loyalitas pelanggan (sudah ada: `customers.loyalty_points`)

### Prinsip Implementasi
1. **Append-style migration** — semua tabel baru ditambahkan sebagai migration idempotent (`CREATE TABLE IF NOT EXISTS`), tidak mengubah tabel existing.
2. **RLS mengikuti pola existing** — setiap tabel baru punya policy `business_id` scope + service_role bypass.
3. **RPC atomic** untuk operasi multi-tabel (ikuti pola `process_sale()`).
4. **Frontend route baru** mengikuti pola `(app)/` + komponen ui yang ada.
