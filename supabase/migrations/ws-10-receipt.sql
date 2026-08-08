-- ============================================================
-- WS-10: Receipt Snapshot + Printer
-- Adds receipt_snapshot and receipt_template_version to sales
-- JANGAN jalankan ke DB live; tulis supabase/migrations/ws-10-receipt.sql
-- ============================================================

-- 1. Add columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS receipt_snapshot jsonb,
ADD COLUMN IF NOT EXISTS receipt_template_version text;

-- 2. Comment for documentation
COMMENT ON COLUMN sales.receipt_snapshot IS 'Immutable receipt payload stored at creation for consistent reprint';
COMMENT ON COLUMN sales.receipt_template_version IS 'Template version used when snapshot was created';