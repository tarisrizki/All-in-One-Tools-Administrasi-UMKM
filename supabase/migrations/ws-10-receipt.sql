-- ============================================================
-- WS-10: Receipt Snapshot + Printer (immutable)
-- Adds receipt_snapshot and receipt_template_version to sales
-- Immutable: trigger prevents overwrite once set
-- ============================================================

-- 1. Add columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS receipt_snapshot jsonb,
ADD COLUMN IF NOT EXISTS receipt_template_version text DEFAULT 'v1';

-- 2. Comments
COMMENT ON COLUMN sales.receipt_snapshot IS 'Immutable receipt payload stored at creation for consistent reprint';
COMMENT ON COLUMN sales.receipt_template_version IS 'Template version used when snapshot was created';

-- 3. Immutability guard: once receipt_snapshot is set, disallow change
CREATE OR REPLACE FUNCTION prevent_receipt_snapshot_overwrite()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.receipt_snapshot IS NOT NULL AND NEW.receipt_snapshot IS DISTINCT FROM OLD.receipt_snapshot THEN
    RAISE EXCEPTION 'receipt_snapshot is immutable and cannot be changed';
  END IF;
  IF OLD.receipt_template_version IS NOT NULL AND NEW.receipt_template_version IS DISTINCT FROM OLD.receipt_template_version THEN
    RAISE EXCEPTION 'receipt_template_version is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_receipt_snapshot ON sales;
CREATE TRIGGER trg_immutable_receipt_snapshot
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION prevent_receipt_snapshot_overwrite();
