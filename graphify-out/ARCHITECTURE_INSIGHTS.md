# Arsitektur Insights — Graph Analysis Summary

**Tanggal:** 2026-08-08  
**Korpus:** 215 files · ~64,123 words · 858 nodes · 1,254 edges · 168 communities

---

## Top-5 Modules Paling Kompleks (by Edge Count)

| # | Module | Edges | Konteks |
|---|-------|-------|---------|
| 1 | `getSupabase()` | **22** | Singleton Supabase client — hub koneksi utama ke database |
| 2 | `authMiddleware()` | **17** | Middleware autentikasi dengan 16 INFERRED edges — perlu verifikasi |
| 3 | `ErrorResponseSchema` | **17** | Schema error terpusat — titik kegagalan tunggal (SPOF) |
| 4 | `createSuccessSchema()` | **17** | Schema response sukses duplikat di banyak route |
| 5 | `compilerOptions` | **15** | Konfigurasi TypeScript tersebar di 2 file berbeda |

**Implikasi:** Modul-modul ini adalah **high-risk change points**. Setiap modifikasi berpotensi affecting banyak consumer. `authMiddleware()`格外需要注意 karena 94% edges-nya adalah INFERRED (model-reasoned, belum diverifikasi).

---

## Top-3 Security Concerns (by Context)

### 1. `authMiddleware()` — 16 Inferred Edges Belum Diverifikasi
```
_authMiddleware() → ai.ts, modules/auth.ts_
```
- 16 dari 17 connections adalah INFERRED (confidence: 0.75)
- Risiko: hubungan autentikasi mungkin tidak complete atau ada path yang terlewat
- **Rekomendasi:** Audit manual seluruh route yang seharusnya menggunakan middleware ini

### 2. 352 Isolated Nodes Termasuk JWT/Token
```
jwt, payload, token — memiliki ≤1 koneksi
```
- Skema autentikasi terfragmentasi
- Token generation (`generate token.cjs`) terisolasi dari flow utama
- **Rekomendasi:** Pastikan JWT lifecycle (generate → validate → refresh) traceable sepenuhnya

### 3. Low Cohesion Communities — Potential Security Blends
| Community | Cohesion | Risk |
|-----------|----------|------|
| `+page.svelte handlesubmit()` | 0.07 | Logic campur aduk — XSS/injection risk |
| `@cloudflare/vitest pool workers` | 0.08 | Test dependencies bisa bocor ke production |
| `tailwind clsx bits` | 0.04 | Third-party UI libs tanpa batas jelas |

---

## Architectural Recommendations

### 1. Extract Shared Types → `types/common.ts`

**Problem:** `ErrorResponseSchema`, `createSuccessSchema()`, `MessageSuccessSchema` duplicating across 17+ routes.

**Solution:**
```typescript
// src/types/common.ts
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
})

export function createSuccessSchema<T>(dataSchema: z.ZodType<T>) {
  return z.object({ data: dataSchema, message: z.string().optional() })
}

// Import di seluruh route
import { ErrorResponseSchema, createSuccessSchema } from '$lib/types/common'
```

### 2. Unify Error Handling → Centralized Error Middleware

**Problem:** Error handling tersebar — setiap route bikin schema sendiri.

**Solution:**
```typescript
// src/middleware/error.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) { super(message) }
}

export function errorResponse(c: Context, err: unknown) {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.status)
  }
  // Log & return generic 500
  console.error(err)
  return c.json({ error: 'Internal Server Error', code: 'INTERNAL' }, 500)
}
```

### 3. Add Integration Tests untuk Auth Flow

**Problem:** `idor.test.ts` sudah ada, tapi auth flow (JWT → middleware → route) belum end-to-end tested.

**Coverage recommendation:**
- `test/auth-flow.ts`: login → JWT → access protected route → logout
- `test/idor.ts`: verify user A tidak bisa akses data user B
- `test/rate-limit.ts`: verify rate limiting di `authMiddleware()`

### 4. Reduce God Node Coupling → Extract Permission Logic

**Problem:** `requirePermission()` + `authMiddleware()` = 31 edges gabungan (23% dari semua edges komunitas).

**Solution:**
```typescript
// src/lib/permissions.ts
export const Permissions = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
} as const

export function requirePermission(permission: keyof typeof Permissions) {
  return async (c: Context, next: Next) => {
    // Extract dari authMiddleware
    const user = c.get('user')
    if (!user?.permissions?.includes(permission)) {
      throw new AppError('FORBIDDEN', 403, 'Insufficient permissions')
    }
    await next()
  }
}
```

### 5. Audit Isolated Nodes → Complete the Graph

**352 nodes dengan ≤1 koneksi.** Prioritas audit:
1. `jwt`, `payload`, `token` → verify auth flow completeness
2. Script files (`fix-demo*.ts`, `migrate*.js`) → apakah masih needed?
3. Third-party deps (`acorn`, `bcryptjs`, `bwip`) → verify usage

---

## Summary Action Items

| Priority | Action | Impact |
|----------|--------|--------|
| 🔴 High | Verifikasi 16 inferred edges `authMiddleware()` | Security hardening |
| 🔴 High | Extract shared schemas ke `$lib/types/common` | Maintainability |
| 🟡 Medium | Centralized error middleware | DX improvement |
| 🟡 Medium | Integration tests untuk auth + IDOR | Security coverage |
| 🟢 Low | Audit 352 isolated nodes | Technical debt reduction |

---

_Generated from graphify-out/GRAPH_REPORT.md · Extraction: 98% EXTRACTED, 2% INFERRED_
