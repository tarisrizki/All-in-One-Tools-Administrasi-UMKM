-- Migration: 005_roles_business_scope.sql
-- Fix: roles table had no business_id at all. Every custom role created via
-- "Tambah Role" was global across ALL businesses on the platform -- any
-- business could see another business's custom roles, and two businesses
-- could never both use the same role name (global UNIQUE(name) constraint).
--
-- After this migration:
--   - business_id is NULL for the 3 shared system roles (owner/admin/cashier)
--   - business_id is set for every custom role, scoping it to its creator
--   - the unique constraint moves from (name) to (business_id, name), so
--     different businesses can freely reuse the same role name

ALTER TABLE roles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Drop the old global-uniqueness constraint if it exists (name may differ
-- slightly depending on how it was created; guard with a DO block so this
-- migration is safe to re-run).
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'roles_name_key'
	) THEN
		ALTER TABLE roles DROP CONSTRAINT roles_name_key;
	END IF;
END $$;

-- Any custom (non owner/admin/cashier) role that predates this migration has
-- no way to know which business it belonged to -- there was no column to
-- record it. We leave those as business_id = NULL (visible to everyone, same
-- as before) rather than guessing; a business owner can simply recreate the
-- role if needed. New roles created after this migration are correctly scoped.

ALTER TABLE roles ADD CONSTRAINT roles_business_name_key UNIQUE (business_id, name);
