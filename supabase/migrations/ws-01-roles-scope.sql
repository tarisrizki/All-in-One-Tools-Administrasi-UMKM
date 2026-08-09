-- ============================================================
-- WS-01: Kontrak roles (P0) — business_id nullable FK -> businesses(id)
-- Idempotent: safe to re-run. Seed global roles tetap (business_id NULL).
-- ============================================================

-- 0. Tambah kolom description jika belum ada (dipakai roles.ts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='description') THEN
    ALTER TABLE roles ADD COLUMN description text;
  END IF;
END $$;

-- 1. Tambah business_id nullable FK ke businesses(id) (BUKAN users(id))
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='business_id') THEN
    ALTER TABLE roles ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Perbaiki FK yang salah jika pernah terlanjur REFERENCES users(id) (jaga-jaga idempotent)
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name FROM pg_constraint
  WHERE conrelid='roles'::regclass AND contype='f'
  AND array_position(conkey, (SELECT attnum FROM pg_attribute WHERE attrelid='roles'::regclass AND attname='business_id')) IS NOT NULL
  LIMIT 1;
  IF fk_name IS NOT NULL THEN
    -- cek apakah FK mengarah ke users; jika ya, drop & recreate ke businesses
    IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.confrelid WHERE c.conname=fk_name AND cl.relname='users') THEN
      EXECUTE format('ALTER TABLE roles DROP CONSTRAINT %I', fk_name);
      ALTER TABLE roles ADD CONSTRAINT roles_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_roles_business_id ON roles(business_id);

-- 2. RLS — sesuaikan: global (NULL) + business scope
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Service role bypass (idempotent, konsisten supabase-rls.sql)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='Service Role Full Access') THEN
    EXECUTE 'CREATE POLICY "Service Role Full Access" ON roles FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- User scope: baca global + milik bisnis sendiri
DROP POLICY IF EXISTS "User Business Scope" ON roles;
CREATE POLICY "User Business Scope" ON roles
  FOR SELECT USING (
    business_id IS NULL
    OR business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "User Business Insert" ON roles;
CREATE POLICY "User Business Insert" ON roles
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "User Business Update" ON roles;
CREATE POLICY "User Business Update" ON roles
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "User Business Delete" ON roles;
CREATE POLICY "User Business Delete" ON roles
  FOR DELETE USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

-- 3. Seed global tetap (business_id NULL) — idempotent
INSERT INTO roles (name, permissions) VALUES
  ('owner',   ARRAY['*']),
  ('admin',   ARRAY['*']),
  ('cashier', ARRAY['pos.read', 'pos.write', 'customers.read', 'reports.read'])
ON CONFLICT (name) DO NOTHING;
