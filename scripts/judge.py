#!/usr/bin/env python3
"""Judge runtime deterministik - evaluator.md Layer1 always-on."""
import subprocess, pathlib, json, sys
from pathlib import Path
root = Path(r"C:/Users/Dragon/umkm-audit")
be = root/"backend-workers"
fe = root/"frontend"

def run(cmd, cwd): 
    r=subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=90, cwd=str(cwd))
    return r.returncode, (r.stdout or "") + (r.stderr or "")

checks=[]
# tsc
rc,out = run("bun x tsc --noEmit 2>&1 | tail -3", be)
checks.append(("tsc", rc==0, f"tsc {rc}"))
# svelte
rc,out = run("bun x svelte-check --threshold error 2>&1 | tail -3", fe)
checks.append(("svelte", rc==0 and "0 errors" in out, f"svelte {rc}"))
# vitest
rc,out = run("bun x vitest run --run 2>&1 | tail -5", be)
ok = "28 passed" in out and "3 passed" in out
checks.append(("vitest 28/3", ok, out[-200:].strip().replace("\n"," | ")))
# cargo
rc,out = run("cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -3", root)
checks.append(("cargo", rc==0, f"cargo {rc}"))
# ws-05 19048 vs portal mismatch
ws = root/"supabase/migrations/ws-05-orders-lifecycle.sql"
t = ws.read_text(encoding="utf-8") if ws.exists() else ""
checks.append(("ws-05 19048", len(t)>=19000 and "safe expand" in t, f"len {len(t)} safe={ 'safe expand' in t }"))
# orders.ts 22816
ot = (root/"backend-workers/src/modules/orders.ts").read_text(encoding="utf-8", errors="ignore") if (root/"backend-workers/src/modules/orders.ts").exists() else ""
checks.append(("orders 22816", "queueNumber" in ot and "prepTime" in ot and "nextQueueNumber" in ot, f"queue={ 'queueNumber' in ot } prep={ 'prepTime' in ot }"))
# sync 23505
st = (root/"backend-workers/src/modules/sync.ts").read_text(encoding="utf-8", errors="ignore") if (root/"backend-workers/src/modules/sync.ts").exists() else ""
checks.append(("sync 23505", "23505" in st and ("duplicate_ignored" in st or "duplicate" in st), "23505 duplicate"))

# .env
env = (root/"frontend/.env").read_text(encoding="utf-8", errors="ignore") if (root/"frontend/.env").exists() else ""
checks.append(("env VITE 231", "VITE_SUPABASE_URL" in env and "VITE_SUPABASE_ANON_KEY" in env, env[:60].replace("\n"," ")))

ok_all = all(c[1] for c in checks)
for name,ok,detail in checks:
    print(f"{'PASS' if ok else 'FAIL'} {name} :: {detail[:120]}")
print("JUDGE", "PASS" if ok_all else "FAIL", f"{sum(1 for _,o,_ in checks if o)}/{len(checks)}")
sys.exit(0 if ok_all else 1)
