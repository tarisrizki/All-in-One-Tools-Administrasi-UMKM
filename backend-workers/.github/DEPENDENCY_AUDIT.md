# Dependency Audit Report

**Package:** `backend-workers`  
**Audited:** 2025-07-22  
**Node.js Runtime:** Cloudflare Workers (workerd)

---

## 1. Unused Dependencies (No import in codebase)

These packages are listed in `dependencies` but **not imported anywhere** in `src/`.

| Package | Version | Reason |
|---------|---------|--------|
| `dotenv` | ^17.4.2 | No `import from 'dotenv'` found. Cloudflare Workers uses `c.env.*` bindings; no `.env` file loading needed. |
| `esbuild` | ^0.17.19 | No `import from 'esbuild'` found. Build tool bundled separately via Wrangler. |
| `mime` | ^3.0.0 | No `import from 'mime'` found. Not used anywhere in source. |
| `mustache` | ^4.2.0 | No `import from 'mustache'` found. Not used anywhere in source. |
| `semver` | ^7.8.5 | No `import from 'semver'` found. Not used anywhere in source. |
| `sharp` | ^0.33.5 | No `import from 'sharp'` found. Cloudflare Workers tidak mendukung native modules seperti sharp; lebih baik gunakan `image-rs` atau Cloudflare Images. |
| `ws` | ^8.18.0 | No `import from 'ws'` found. WebSocket mungkin via Workers runtime, bukan library eksternal. |

**Recommended action:** Remove all 7 packages.

---

## 2. Transitive Dependencies Listed as Direct

These packages are **likely bundled as transitive dependencies** from `hono`, `miniflare`, `wrangler`, or `unenv` — not imported directly.

| Package | Likely Source | Action |
|---------|---------------|--------|
| `acorn` | miniflare, vite | Investigate — remove if unused |
| `acorn-walk` | esbuild/rollup ecosystem | Likely transitive |
| `as-table` | stacktracey | Likely transitive |
| `blake3-wasm` | miniflare | Keep only if directly used |
| `color` | youch, kleur | Likely transitive |
| `color-convert` | color | Likely transitive |
| `color-name` | color | Likely transitive |
| `color-string` | color | Likely transitive |
| `cookie` | hono | Likely transitive |
| `data-uri-to-buffer` | hono/fetch | Likely transitive |
| `defu` | unenv | Likely transitive |
| `detect-libc` | sharp, esbuild | Keep if needed |
| `escape-string-regexp` | various | Likely transitive |
| `estree-walker` | rollup/esbuild | Likely transitive |
| `exit-hook` | vitest | Likely dev-only transitive |
| `exsolve` | unenv | Likely transitive |
| `get-source` | miniflare | Likely transitive |
| `glob-to-regexp` | miniflare | Likely transitive |
| `iceberg-js` | hono/logger | Likely transitive |
| `is-arrayish` | cookie, color | Likely transitive |
| `magic-string` | rollup, sourcemap | Likely transitive |
| `ohash` | unenv | Likely transitive |
| `pathe` | unenv | Likely transitive |
| `printable-characters` | miniflare | Likely transitive |
| `rollup-plugin-inject` | unknown | **Possibly unused** |
| `rollup-plugin-node-polyfills` | unknown | **Possibly unused** |
| `rollup-pluginutils` | rollup plugins | Likely transitive |
| `simple-swizzle` | color | Likely transitive |
| `source-map` | esbuild | Likely transitive |
| `sourcemap-codec` | rollup | Likely transitive |
| `stacktracey` | youch | Likely transitive |
| `stoppable` | miniflare | Likely transitive |
| `tslib` | tsc output | Keep (TypeScript) |
| `ufo` | unenv | Likely transitive |
| `unenv` | miniflare | Likely transitive |
| `youch` | hono error handling | Likely transitive |

**Recommended action:** Test removal one-by-one or use `depcheck` tool for automated detection. Most of these should be deduped via `npm ls <pkg>`.

---

## 3. DevDependencies vs Dependencies Misclassification

### 3a. Should be `devDependencies` (currently in `dependencies`)

| Package | Current | Should Be | Reason |
|---------|---------|-----------|--------|
| `miniflare` | dependencies | devDependencies | Only used during local dev with `npm run dev` |
| `workerd` | dependencies | devDependencies | Bundled runtime, not needed in production Workers |
| `wrangler` | devDependencies | devDependencies | ✅ Correct |

### 3b. Should be `dependencies` (currently in `devDependencies`)

| Package | Current | Should Be | Reason |
|---------|---------|-----------|--------|
| `@types/bcryptjs` | devDependencies | REMOVE | **Unused** — codebase uses native Web Crypto API (PBKDF2-SHA256) instead of bcryptjs. This type definition is for a package that isn't installed. |
| `@types/bwip-js` | devDependencies | dependencies | `bwip-js` is used in `src/modules/products.ts` for barcode generation — type definitions are needed at runtime. |

---

## 4. Outdated Versions (Minor/Patch)

Checking latest versions vs current:

| Package | Current | Latest | Update Type |
|---------|---------|--------|-------------|
| `typescript` | ^7.0.2 | ^5.7.x | ⚠️ **Downgrade needed** — TypeScript 7.x appears unreleased. Latest stable is **5.7.x**. Check if `^7.0.2` is typo. |
| `@types/bcryptjs` | ^2.4.6 | 2.4.6 | Latest (but unused — recommend removal) |
| `@types/bwip-js` | ^3.2.3 | 3.2.3 | Latest |
| `@cloudflare/workers-types` | ^5.20260710.1 | Check npm | ⚠️ Future date — verify version is correct |
| `@cloudflare/vitest-pool-workers` | ^0.18.4 | Check npm | Check for updates |
| `vitest` | ^4.1.10 | 2.x | Major version available (v5 is latest) |
| `wrangler` | ^4.110.0 | Check npm | Check for updates |
| `undici` | ^5.29.0 | 6.x | Minor update available |
| `hono` | ^4.12.28 | 4.x | Check for minor updates |
| `@supabase/supabase-js` | ^2.110.2 | 2.x | Check for updates |

> ⚠️ **TypeScript 7.0.2 does not exist** — this is likely a typo or invalid version. Downgrade to `^5.7.0` after verifying compatibility.

---

## Summary & Recommended Actions

### Immediate Removals (Safe)
```bash
npm uninstall dotenv esbuild mime mustache semver sharp ws @types/bcryptjs
```

### Reclassify (devDependencies → dependencies)
```bash
npm uninstall @types/bwip-js && npm install @types/bwip-js --save
```

### Reclassify (dependencies → devDependencies)
```bash
npm uninstall miniflare workerd
npm install miniflare workerd --save-dev
```

### Version Fixes
```bash
npm install typescript@^5.7.0 --save-dev
```

### After Changes
1. Run `npm install`
2. Run `npm run test` to verify nothing breaks
3. Run `npx wrangler dev` to test local development
4. Run `npx wrangler deploy --dry-run` to verify build

---

*Audit performed by analyzing `src/**/*.ts` imports vs `package.json` dependencies.*
