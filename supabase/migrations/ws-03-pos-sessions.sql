-- ============================================================
-- WS-03: POS Session / Closing (P1)
-- Tabel pos_sessions + pos_payouts + sales.session binding
-- ============================================================

-- POS Sessions: business_id FK businesses(id), user tracking, cash variance
CREATE TABLE IF NOT EXISTS pos_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id),
  opened_at       timestamptz DEFAULT now(),
  opening_cash    numeric NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closed_at       timestamptz,
  closing_cash    numeric CHECK (closing_cash >= 0),
  expected_cash   numeric,
  variance        numeric DEFAULT 0,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_business_id ON pos_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_user_id ON pos_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON pos_sessions(opened_at);

-- POS Payouts: cash taken out during an open session
CREATE TABLE IF NOT EXISTS pos_payouts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES pos_sessions(id) ON DELETE CASCADE,
  amount      numeric NOT NULL CHECK (amount > 0),
  reason      text NOT NULL,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_payouts_session_id ON pos_payouts(session_id);

-- Sales binding to session (pos_session_id FK)
-- supabase-rls.sql already has sales.session_id; add pos_session_id for WS-03 spec compliance
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='pos_session_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN pos_session_id uuid REFERENCES pos_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sales_pos_session_id ON sales(pos_session_id);
-- Ensure legacy session_id column exists if DB was created before WS-03
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='session_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN session_id uuid REFERENCES pos_sessions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sales_session_id ON sales(session_id);
  END IF;
END $$;

-- RLS
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payouts ENABLE ROW LEVEL SECURITY;

-- Service role full access (backend bypass)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pos_sessions','pos_payouts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service Role Full Access" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Service Role Full Access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- User business scope
DO $$
BEGIN
  DROP POLICY IF EXISTS "User Business Scope" ON pos_sessions;
  CREATE POLICY "User Business Scope" ON pos_sessions FOR ALL
    USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
    WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

  DROP POLICY IF EXISTS "User Business Scope" ON pos_payouts;
  -- pos_payouts scoped via parent session's business_id
  CREATE POLICY "User Business Scope" ON pos_payouts FOR ALL
    USING (session_id IN (SELECT id FROM pos_sessions WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())))
    WITH CHECK (session_id IN (SELECT id FROM pos_sessions WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));
END $$;

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='set_updated_at') THEN
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END $f$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_updated_at_pos_sessions ON pos_sessions;
CREATE TRIGGER trg_updated_at_pos_sessions BEFORE UPDATE ON pos_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
