-- Migration: 003_debts_schema.sql
-- Sprint S7 — Hutang-Piutang

-- =============================================================
-- DEBTS (Hutang / Piutang)
-- =============================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'payable' (hutang ke supplier), 'receivable' (piutang dari pelanggan)
  entity_name VARCHAR(255) NOT NULL, -- Nama pihak terkait
  entity_phone VARCHAR(30),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, partial, paid
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debts_business_id ON debts(business_id);
CREATE INDEX idx_debts_status ON debts(business_id, status);

-- =============================================================
-- DEBT PAYMENTS (Riwayat Cicilan/Pelunasan)
-- =============================================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL, -- cash, transfer, dll
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_debt_payments_debt_id ON debt_payments(debt_id);
