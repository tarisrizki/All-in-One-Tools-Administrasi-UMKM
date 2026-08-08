-- ============================================================
-- WS-03: POS Session / Closing (P1)
-- Table: pos_sessions + closure logic
-- ============================================================
-- Create table pos_sessions
-- Columns:
--   id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   business_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
--   user_id       uuid NOT NULL REFERENCES users(id)
--   opening_cash  numeric
--   closing_cash  numeric
--   expected_cash numeric
--   variance      numeric   -- calculated = closing_cash - expected_cash
--   status        text    DEFAULT 'open'
--   opened_at     timestamptz DEFAULT now()
--   closed_at     timestamptz
--   created_at    timestamptz DEFAULT now()
--   created_by    uuid REFERENCES users(id)

-- Enable RLS on pos_sessions
-- Policies:
--   SELECT   ANY  (policy: "allow if business_id matches current_user's business")
--   INSERT   Policy same as SELECT
--   UPDATE   Policy same as SELECT
--   DELETE   Policy same as SELECT

-- Function to close session (optional RPC)
-- UPDATE pos_sessions SET closing_cash = $1, expected_cash = $2, variance = $3, status='closed', closed_at=NOW(), updated_by=$4 WHERE id=$5 AND business_id=current_setting('userId')::uuid;
-- Return variance for audit

-- ============================================================
-- WS-07: Outlet Hierarchy (P1)
-- ============================================================
-- 1) Table outlets
--   id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   business_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
--   name          text NOT NULL
--   address       text
--   parent_id     uuid REFERENCES outlets(id)   -- for hierarchy (e.g., flagship > branch)
--   is_active     boolean DEFAULT true
--   created_at    timestamptz DEFAULT now()
--   created_by    uuid REFERENCES users(id)

-- 2) Add column outlet_id to users (optional denormalized reference)
--   ALTER TABLE users ADD COLUMN outlet_id uuid REFERENCES outlets(id) ON DELETE SET NULL;

-- 3) RLS policies for outlets & users
--    - policies use business_id & (optional) parent hierarchy checks
--    - user_outlets many‑to‑many optional but can be implicit via outlet_id foreign key

-- 4) Seed sample outlet hierarchy if needed

-- ============================================================
-- WS-07: Permission scopes update (in roles.ts & auth middleware)
--   New permission entries: 'outlet.read', 'outlet.write', 'outlet.manage'
--   Update roleSchema to allow those strings in array 'permissions'
--   Update requirePermission() usage wherever outlet‑scoped operations happen

-- ============================================================
-- WS-12: Research consolidation completed (already merged)
-- No new file generated; evidence matrix updated manually.

EOF