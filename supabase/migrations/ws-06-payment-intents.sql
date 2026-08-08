-- ============================================================
-- WS-06: Payment Intent / QRIS
-- Payment status tracking + idempotent webhook callbacks
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS payment_intents (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id           uuid REFERENCES sales(id) ON DELETE SET NULL,
  provider          text NOT NULL CHECK (provider IN ('cash', 'qris', 'transfer', 'ewallet')),
  provider_reference text,
  amount            numeric NOT NULL CHECK (amount > 0 AND amount <= 10000000),
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  callback_id       text UNIQUE,
  callback_payload  jsonb DEFAULT '{}',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_callbacks (
  callback_id  text PRIMARY KEY,
  intent_id    uuid NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  payload      jsonb NOT NULL DEFAULT '{}',
  processed_at timestamptz DEFAULT now()
);

-- ---------- Indexes ----------

CREATE INDEX IF NOT EXISTS idx_payment_intents_business_id
  ON payment_intents(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_sale_id
  ON payment_intents(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_intents_status
  ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_reference
  ON payment_intents(provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_callbacks_intent_id
  ON payment_callbacks(intent_id);

-- ---------- Auto-update updated_at ----------

CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_intents_updated_at ON payment_intents;
CREATE TRIGGER payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_payment_intents_updated_at();

-- ---------- RLS ----------

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_callbacks ENABLE ROW LEVEL SECURITY;

-- payment_intents: owner/cashier/admin bisa read, admin+owner write
DROP POLICY IF EXISTS "payment_intents_select" ON payment_intents;
CREATE POLICY "payment_intents_select" ON payment_intents
  FOR SELECT USING (
    business_id IN (
      SELECT u.business_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payment_intents_insert" ON payment_intents;
CREATE POLICY "payment_intents_insert" ON payment_intents
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT u.business_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payment_intents_update" ON payment_intents;
CREATE POLICY "payment_intents_update" ON payment_intents
  FOR UPDATE USING (
    business_id IN (
      SELECT u.business_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- payment_callbacks: hanya insert (webhook) + read via intent join
DROP POLICY IF EXISTS "payment_callbacks_insert" ON payment_callbacks;
CREATE POLICY "payment_callbacks_insert" ON payment_callbacks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "payment_callbacks_select" ON payment_callbacks;
CREATE POLICY "payment_callbacks_select" ON payment_callbacks
  FOR SELECT USING (
    intent_id IN (
      SELECT pi.id FROM payment_intents pi
      WHERE pi.business_id IN (
        SELECT u.business_id FROM users u WHERE u.id = auth.uid()
      )
    )
  );
