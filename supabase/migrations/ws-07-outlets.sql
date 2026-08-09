-- ============================================================
-- WS-07: Outlet Hierarchy + Assignment + Scope Auth + IDOR (P1)
-- Idempotent: IF NOT EXISTS / DROP IF EXISTS aman dijalankan ulang.
-- FK businesses(id) bukan users(id) — verifikasi tsc 0 & FK benar.
-- ============================================================

-- ---------- 0. Helper updated_at (reuse jika ada) ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- 1. Tabel outlets (hierarchy parent/child) ----------
CREATE TABLE IF NOT EXISTS outlets (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES outlets(id) ON DELETE SET NULL,
  name        text NOT NULL,
  code        text,
  address     text,
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT chk_outlet_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT uq_outlets_business_name UNIQUE (business_id, name)
);

-- pastikan kolom ada jika tabel lama tanpa kolom baru (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='parent_id') THEN
    ALTER TABLE outlets ADD COLUMN parent_id uuid REFERENCES outlets(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='code') THEN
    ALTER TABLE outlets ADD COLUMN code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='is_active') THEN
    ALTER TABLE outlets ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_outlets_business_id ON outlets(business_id);
CREATE INDEX IF NOT EXISTS idx_outlets_parent_id ON outlets(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outlets_business_parent ON outlets(business_id, parent_id);

-- ---------- 2. Tabel user_outlets (assignment many-to-many) ----------
CREATE TABLE IF NOT EXISTS user_outlets (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id   uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, outlet_id)
);
CREATE INDEX IF NOT EXISTS idx_user_outlets_user_id ON user_outlets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_outlets_outlet_id ON user_outlets(outlet_id);

-- ---------- 3. outlet_id pada sales & purchase_orders ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='outlet_id') THEN
    ALTER TABLE sales ADD COLUMN outlet_id uuid REFERENCES outlets(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='outlet_id') THEN
    ALTER TABLE purchase_orders ADD COLUMN outlet_id uuid REFERENCES outlets(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sales_outlet_id ON sales(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_outlet_id ON purchase_orders(outlet_id) WHERE outlet_id IS NOT NULL;

-- ---------- 4. Trigger updated_at ----------
DROP TRIGGER IF EXISTS trg_outlets_updated_at ON outlets;
CREATE TRIGGER trg_outlets_updated_at BEFORE UPDATE ON outlets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- 5. RLS ----------
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;

-- Service Role bypass (konsisten supabase-rls.sql)
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['outlets','user_outlets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service Role Full Access" ON %I', t);
    EXECUTE format('CREATE POLICY "Service Role Full Access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- User-scoped policies: outlets hanya dalam business yang sama
DROP POLICY IF EXISTS "User Business Scope" ON outlets;
CREATE POLICY "User Business Scope" ON outlets FOR ALL
USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- user_outlets: user hanya melihat assignment dalam business-nya
DROP POLICY IF EXISTS "User Business Scope" ON user_outlets;
CREATE POLICY "User Business Scope" ON user_outlets FOR ALL
USING (
  user_id IN (SELECT id FROM users WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
  OR outlet_id IN (SELECT id FROM outlets WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
)
WITH CHECK (
  outlet_id IN (SELECT id FROM outlets WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
);

-- ---------- 6. RPC helper: cek akses outlet (untuk IDOR test) ----------
CREATE OR REPLACE FUNCTION is_outlet_accessible(p_user_id uuid, p_outlet_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_business uuid; v_count int;
BEGIN
  SELECT business_id INTO v_business FROM users WHERE id = p_user_id;
  IF v_business IS NULL THEN RETURN false; END IF;
  -- outlet harus milik business yang sama
  SELECT COUNT(*) INTO v_count FROM outlets WHERE id = p_outlet_id AND business_id = v_business;
  IF v_count = 0 THEN RETURN false; END IF;
  -- jika user punya assignment, harus termasuk; jika tidak ada assignment sama sekali -> dianggap global (owner/admin belum di-assign)
  SELECT COUNT(*) INTO v_count FROM user_outlets WHERE user_id = p_user_id;
  IF v_count = 0 THEN RETURN true; END IF;
  SELECT COUNT(*) INTO v_count FROM user_outlets WHERE user_id = p_user_id AND outlet_id = p_outlet_id;
  RETURN v_count > 0;
END; $$;

-- ---------- 7. Prevent deep cycle (ponytail: hanya cegah self-parent, deep cycle cek di app) ----------
-- ponytail: ceiling self-loop only; add recursive CTE trigger when hierarchy >2 levels needs cycle guard
