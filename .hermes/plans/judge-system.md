# Judge System — Hermes Beres UMKM

## Konteks
- 4-step sequential verified: Step1 .env VITE_* → Step2 orders.ts wire → Step3 sync 23505→200 → Step4 ws-05 db push (199)
- Research evaluator.md 247 lines: Evaluator = external scoring (tests/rubrics/graders), Reflection = internal critique
- Perintah: judge untuk diri sendiri, terse, kalau gapaham cari internet

## Goal
Judge runtime deterministik cheap always-on per docs evaluator.md Implementation Priority (1) runtime verification formalization

## Design
- Layer1 Runtime (always on): tsc 0, svelte-check 0, vitest 28/28, cargo check, supabase orders/dining_tables columns, ws-05 19048 safe expand
- Layer2 Eval suite (on-demand N=3): YAML tasks 4 steps, graders code-based + LLM rubric kalau perlu, verification_evidence.db, capability/regression split + graduation 0.9
- Outcome over transcript: grade env state (db count, file exists) bukan kata agent
- Fresh context untuk LLM rubric agar anti bias implementasi

## Constraints
- Terse, sequential verified, jangan tambah fitur di luar 4 step
- Database-design IF NOT EXISTS → ALTER ADD COLUMN IF NOT EXISTS lock_timeout

## Steps
1. Cek .env VITE_* 231 front/build 1.5M ssr false
2. Cek orders.ts 22816 mount /orders KDS queue convert
3. Cek sync 23505 duplicate_ignored saleCount head:true sales custom head
4. Cek ws-05 19048 5 tables RLS convert/next_queue outlet_id DO

## Verification
- judge.py ad-hoc: tsc 0 svelte 0 vitest 28 cargo dev 2.22s orders cnt 0
- report delta pass rate tokens latency cost (nanti trial runner)
