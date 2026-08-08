# Backend-Workers Refactor Plan

## File Size Overview

```
   606 ./sales.ts         ⚠️  OVERSIZED
   418 ./reports.ts       ⚠️  OVERSIZED
   355 ./auth.ts          ⚠️  OVERSIZED
   334 ./products.ts       ⚠️  OVERSIZED
   328 ./debts.ts         ⚠️  OVERSIZED
   321 ./purchases.ts     ⚠️  OVERSIZED
   306 ./customers.ts     ⚠️  OVERSIZED
   305 ./ai.ts            ⚠️  OVERSIZED
   258 ./sync.ts
   246 ./settings.ts
   236 ./employees.ts
   221 ./roles.ts
   208 ./categories.ts
   192 ./cashbook.ts
   191 ./suppliers.ts
   190 ./warehouses.ts
    39 ./health.ts
```

---

## Module Analysis & Extraction Plan

### 1. `sales.ts` (606 lines) — PRIORITY: HIGH

**Tanggung jawab:**
1. **CRUD Sales + payment processing** (routes utama, ~150 lines)
2. **Document generation** — invoice data building (lines ~400-479, ~80 lines)
3. **External integrations** — WA (Fonnte) & Email (Resend) sender (lines ~485-606, ~120 lines)

**Opsi extract:**
- `sales/invoice.ts` — helper `buildInvoiceDocument()` + document route
- `sales/notifications.ts` — `sendWhatsApp()`, `sendEmail()` functions
- **Catatan:** Schema (`saleItemSchema`, `paymentSchema`, `saleSchema`) stay in module (used locally only)

**Verdict:** Extract notification logic. Invoice builder optional.

---

### 2. `reports.ts` (418 lines) — PRIORITY: MEDIUM

**Tanggung jawab:**
1. **5 Report types** — profit-loss, cash-flow, sales, inventory, dashboard (each ~80-100 lines)
2. **Each report has its own query logic** — very repetitive

**Opsi extract:**
- `reports/queries/` — separate query builder per report type
- `reports/helpers.ts` — shared aggregation helpers (`sumSales`, `mapProducts`, etc.)
- OR keep monolithic but extract inline logic to named functions

**Verdict:** Low urgency. Reports are cohesive. Consider `reports/calculations.ts` if complexity grows.

---

### 3. `auth.ts` (355 lines) — PRIORITY: MEDIUM

**Tanggung jawab:**
1. **5 Auth routes** — register, login, me, refresh, logout (~150 lines)
2. **Token management** — `signTokenPair()`, JWT helpers (~15 lines)
3. **Business initialization** — warehouse + category seeding in register (~30 lines)

**Opsi extract:**
- `auth/token.ts` — `signTokenPair()`, token constants (TTL), refresh logic
- `auth/seed.ts` — default business seeding logic (used only in register)
- **Catatan:** `registerSchema`, `loginSchema` bisa dipindah ke `schemas/` jika dipakai ulang

**Verdict:** Extract token helpers. Seed logic is single-use.

---

### 4. `products.ts` (334 lines) — PRIORITY: MEDIUM

**Tanggung jawab:**
1. **CRUD Products** (list, create) — ~100 lines
2. **Barcode generation** — bwipjs wrapper (~35 lines)
3. **QR Code generation** — bwipjs wrapper (~30 lines)

**Opsi extract:**
- `products/barcode.ts` — `generateBarcode()`, `generateQRCode()` helpers
- **Catatan:** Schema `productSchema` sudah clean, tidak perlu extract

**Verdict:** Extract barcode/QR helpers ke subfolder. Good candidate for utility extraction.

---

### 5. `customers.ts` (306 lines) — PRIORITY: LOW

**Tanggung jawab:**
1. **CRUD Customers** — ~120 lines
2. **Tier calculation** — `calculateTier()` inline (~5 lines)
3. **Spent aggregation** — per-customer total spent calculation (in list/detail routes)

**Opsi extract:**
- `customers/tier.ts` — `calculateTier()` + tier thresholds as constants
- `customers/queries.ts` — spent aggregation helper

**Verdict:** Low urgency. Module is borderline (306 vs 300 limit).

---

### 6. `ai.ts` (305 lines) — PRIORITY: LOW

**Tanggung jawab:**
1. **3 AI endpoints** — predictions, summary, chat (~150 lines)
2. **AI helpers** — `callGemini()`, `checkAndIncrementAiUsage()` (~50 lines)

**Opsi extract:**
- `ai/gemini.ts` — `callGemini()`, rate-limit helper
- Schema sudah inline, tidak ada yang reuse

**Verdict:** Low urgency. AI logic is self-contained.

---

### 7. `debts.ts` (328 lines) — PRIORITY: LOW

**Tanggung jawab:**
1. **CRUD Debts** + payments — coherent domain

**Verdict:** No extraction needed. Domain is cohesive.

---

### 8. `purchases.ts` (321 lines) — PRIORITY: LOW

**Tanggung jawab:**
1. **CRUD Purchase Orders** + status transitions — coherent domain

**Verdict:** No extraction needed. Domain is cohesive.

---

## Schemas (`src/schemas/`)

**Current:** `src/schemas/common.ts` (20 lines) — ErrorResponse, createSuccess, MessageSuccess

**Observation:**
- Schema yang reusable (ErrorResponse, Success schemas) ✅ sudah di `schemas/common.ts`
- Inline schemas (`saleSchema`, `productSchema`, dll) hanya dipakai di module masing-masing → tidak perlu extract
- **No duplicate schemas found.** Modules mengimport dari `../schemas/common.ts` ✅

**Recommendation:** No action needed.

---

## Middleware (`src/middleware/`)

**Files:**
- `auth.ts` (86 lines) — `authMiddleware`, `requirePermission`
- `rateLimit.ts` (77 lines) — `rateLimitMiddleware`

**Usage in `src/index.ts`:**
```typescript
import { rateLimitMiddleware } from './middleware/rateLimit';
// Applied globally: app.use('*', rateLimitMiddleware);
// No explicit import of authMiddleware in index.ts — each module applies it individually
```

**Findings:**
1. ✅ `rateLimitMiddleware` — imported and used in `index.ts` (global)
2. ✅ `authMiddleware` — NOT in index.ts (correct, applied per-module via `authRoute.use('*', authMiddleware)` pattern)
3. ✅ Both middleware files are used

**Dead code check:** No unused middleware found.

---

## Implementation Priority

| Priority | File | Action |
|----------|------|--------|
| HIGH | `sales.ts` | Extract `sales/notifications.ts` |
| MEDIUM | `products.ts` | Extract `products/barcode.ts` |
| MEDIUM | `auth.ts` | Extract `auth/token.ts` |
| LOW | `reports.ts` | Consider `reports/calculations.ts` (optional) |
| LOW | `customers.ts` | Extract `customers/tier.ts` (optional) |
| NONE | `debts.ts`, `purchases.ts`, `ai.ts` | Cohesive, no action |

---

## Post-Refactor Target

```
src/modules/
├── sales/
│   ├── index.ts          (~480 lines — tanpa notifikasi)
│   └── notifications.ts  (~120 lines — WA + Email)
├── auth/
│   ├── index.ts          (~295 lines — tanpa token logic)
│   └── token.ts         (~25 lines — signTokenPair, TTL)
├── products/
│   ├── index.ts          (~260 lines — tanpa barcode logic)
│   └── barcode.ts        (~70 lines — barcode + QR generator)
├── reports/
│   ├── index.ts          (~418 lines — tetap monolithic)
│   └── calculations.ts   (future, optional)
└── customers/
    ├── index.ts          (~295 lines — tanpa tier logic)
    └── tier.ts           (~10 lines — tier calculator)
```
