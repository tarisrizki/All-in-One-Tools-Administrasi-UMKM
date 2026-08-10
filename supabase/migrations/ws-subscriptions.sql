-- WS: subscriptions (Svelte landing only) — businesses langganan aktif/tidak + history
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','pro','enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','canceled','trialing')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status) WHERE status='active';
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Service Role Full Access') THEN EXECUTE 'CREATE POLICY "Service Role Full Access" ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true)'; END IF; END $$;
DROP POLICY IF EXISTS "User Business Scope" ON subscriptions;
CREATE POLICY "User Business Scope" ON subscriptions FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));
