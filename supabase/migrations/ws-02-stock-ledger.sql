-- ============================================================
-- WS-02: Stock Movement Ledger (P0)
-- Immutable stock movement ledger for POS sale/purchase/opname/reversal
-- ============================================================
-- Idempotent: IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + OR REPLACE
-- FK business_id -> businesses(id). Index (business_id, product_id, created_at).
-- product_stock is projection; stock_movements is immutable ledger.
-- ============================================================

-- ---------- 0. Extensions ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- 1. product_stock (projection) - ensure exists ----------
CREATE TABLE IF NOT EXISTS product_stock (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity     integer DEFAULT 0,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- ---------- 2. stock_movements (immutable ledger) ----------
-- Canonical columns per spec: business_id, warehouse_id, product_id,
--   source_type sale/purchase/adjustment/opname/reversal,
--   source_id, quantity_delta, unit_cost, created_by, created_at
-- Legacy columns (type/qty/reference_type/reference_id/notes) kept nullable for backward compat with ws-08/supabase-rls.sql
CREATE TABLE IF NOT EXISTS stock_movements (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warehouse_id    uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_type     text NOT NULL CHECK (source_type IN ('sale','purchase','adjustment','opname','reversal')),
  source_id       uuid,
  quantity_delta  integer NOT NULL,
  unit_cost       numeric DEFAULT 0,
  -- legacy compat (nullable)
  type            text CHECK (type IN ('sale','purchase','adjustment_in','adjustment_out','transfer_in','transfer_out')),
  qty             integer,
  reference_type  text,
  reference_id    uuid,
  notes           text,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz DEFAULT now()
);

-- Ensure missing columns on pre-existing table (idempotent additive migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='source_type') THEN
    ALTER TABLE stock_movements ADD COLUMN source_type text CHECK (source_type IN ('sale','purchase','adjustment','opname','reversal'));
    -- backfill legacy rows where possible
    UPDATE stock_movements SET source_type = CASE
      WHEN type='sale' THEN 'sale'
      WHEN type='purchase' THEN 'purchase'
      WHEN type IN ('adjustment_in','adjustment_out') THEN 'adjustment'
      ELSE 'adjustment' END
    WHERE source_type IS NULL;
    ALTER TABLE stock_movements ALTER COLUMN source_type SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='source_id') THEN
    ALTER TABLE stock_movements ADD COLUMN source_id uuid;
    UPDATE stock_movements SET source_id = reference_id WHERE source_id IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='quantity_delta') THEN
    ALTER TABLE stock_movements ADD COLUMN quantity_delta integer;
    UPDATE stock_movements SET quantity_delta = CASE
      WHEN type IN ('sale','adjustment_out','transfer_out') THEN -COALESCE(qty,0)
      ELSE COALESCE(qty,0) END
    WHERE quantity_delta IS NULL;
    ALTER TABLE stock_movements ALTER COLUMN quantity_delta SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='unit_cost') THEN
    ALTER TABLE stock_movements ADD COLUMN unit_cost numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='type') THEN
    ALTER TABLE stock_movements ADD COLUMN type text CHECK (type IN ('sale','purchase','adjustment_in','adjustment_out','transfer_in','transfer_out'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='qty') THEN
    ALTER TABLE stock_movements ADD COLUMN qty integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='reference_type') THEN
    ALTER TABLE stock_movements ADD COLUMN reference_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='reference_id') THEN
    ALTER TABLE stock_movements ADD COLUMN reference_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='notes') THEN
    ALTER TABLE stock_movements ADD COLUMN notes text;
  END IF;
END $$;

-- ---------- 3. Index (business_id, product_id, created_at) ----------
CREATE INDEX IF NOT EXISTS idx_stock_movements_business_product_created
  ON stock_movements(business_id, product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_source
  ON stock_movements(source_type, source_id) WHERE source_id IS NOT NULL;

-- ---------- 4. RLS + immutability ----------
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_movements','product_stock'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service Role Full Access" ON %I', t);
    EXECUTE format('CREATE POLICY "Service Role Full Access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "User Business Scope" ON stock_movements;
CREATE POLICY "User Business Scope" ON stock_movements FOR ALL
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "User Business Scope" ON product_stock;
CREATE POLICY "User Business Scope" ON product_stock FOR ALL
  USING (
    warehouse_id IN (SELECT id FROM warehouses WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
    OR product_id IN (SELECT id FROM products WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
  );

-- Immutable: forbid UPDATE/DELETE on stock_movements except service_role (policy already restricts, plus trigger)
CREATE OR REPLACE FUNCTION prevent_stock_movement_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'stock_movements is immutable — UPDATE/DELETE not allowed (use reversal entry)';
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_stock_movements_immutable_update ON stock_movements;
CREATE TRIGGER trg_stock_movements_immutable_update BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_mutation();

-- ---------- 5. RPC: process_sale (atomic ledger + projection, FOR UPDATE, no negative) ----------
CREATE OR REPLACE FUNCTION process_sale(
  p_business_id           uuid,
  p_warehouse_id          uuid,
  p_customer_id           uuid,
  p_session_id            uuid DEFAULT NULL,
  p_client_transaction_id uuid DEFAULT NULL,
  p_invoice_number        text DEFAULT NULL,
  p_subtotal              numeric DEFAULT 0,
  p_discount_total        numeric DEFAULT 0,
  p_grand_total           numeric DEFAULT 0,
  p_created_by            uuid DEFAULT NULL,
  p_items                 jsonb DEFAULT '[]',
  p_payments              jsonb DEFAULT '[]',
  p_redeem_points         int DEFAULT 0,
  p_earned_points         int DEFAULT 0,
  p_customer_name         text DEFAULT NULL,
  p_customer_phone        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id    uuid;
  v_existing   uuid;
  v_item       jsonb;
  v_stock      integer;
  v_cost       numeric;
  v_total_paid numeric := 0;
  v_status     text;
BEGIN
  IF p_client_transaction_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM sales
    WHERE business_id = p_business_id AND client_transaction_id = p_client_transaction_id;
    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object('id', v_existing, 'invoice_number', (SELECT invoice_number FROM sales WHERE id = v_existing), 'duplicate', true);
    END IF;
  END IF;

  INSERT INTO sales (business_id, warehouse_id, customer_id, session_id, client_transaction_id, invoice_number, subtotal, discount_total, grand_total, created_by, status)
  VALUES (p_business_id, p_warehouse_id, p_customer_id, p_session_id, p_client_transaction_id, COALESCE(p_invoice_number, 'INV/'||substr(gen_random_uuid()::text,1,8)), p_subtotal, p_discount_total, p_grand_total, p_created_by, 'draft')
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (sale_id, product_id, qty, price, discount)
    VALUES (v_sale_id, (v_item->>'product_id')::uuid, (v_item->>'qty')::int, (v_item->>'price')::numeric, COALESCE((v_item->>'discount')::numeric,0));

    SELECT quantity INTO v_stock FROM product_stock
    WHERE product_id = (v_item->>'product_id')::uuid AND warehouse_id = p_warehouse_id FOR UPDATE;
    IF v_stock IS NULL THEN v_stock := 0; END IF;
    IF v_stock < (v_item->>'qty')::int THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk produk %', v_item->>'product_id';
    END IF;

    SELECT cost_price INTO v_cost FROM products WHERE id = (v_item->>'product_id')::uuid;
    IF v_cost IS NULL THEN v_cost := COALESCE((v_item->>'price')::numeric,0); END IF;

    UPDATE product_stock SET quantity = quantity - (v_item->>'qty')::int, updated_at = now()
    WHERE product_id = (v_item->>'product_id')::uuid AND warehouse_id = p_warehouse_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk produk %', v_item->>'product_id';
    END IF;

    -- immutable ledger entry: sale = negative delta
    INSERT INTO stock_movements (business_id, warehouse_id, product_id, source_type, source_id, quantity_delta, unit_cost, created_by, type, qty, reference_type, reference_id)
    VALUES (p_business_id, p_warehouse_id, (v_item->>'product_id')::uuid, 'sale', v_sale_id, -((v_item->>'qty')::int), v_cost, p_created_by, 'sale', (v_item->>'qty')::int, 'sale', v_sale_id);
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (sale_id, method, amount) VALUES (v_sale_id, v_item->>'method', (v_item->>'amount')::numeric);
    v_total_paid := v_total_paid + (v_item->>'amount')::numeric;
  END LOOP;

  v_status := CASE WHEN v_total_paid >= p_grand_total THEN 'paid' ELSE 'partial' END;
  UPDATE sales SET status = v_status WHERE id = v_sale_id;

  IF v_status <> 'paid' THEN
    INSERT INTO debts (business_id, type, entity_name, entity_phone, amount, remaining_amount, status, notes, created_by)
    VALUES (p_business_id, 'piutang', COALESCE(p_customer_name,'Pelanggan Umum'), p_customer_phone, (p_grand_total - v_total_paid), (p_grand_total - v_total_paid), 'unpaid', 'Piutang transaksi '||COALESCE(p_invoice_number,''), p_created_by);
  END IF;

  IF p_customer_id IS NOT NULL THEN
    UPDATE customers SET loyalty_points = loyalty_points - p_redeem_points + p_earned_points WHERE id = p_customer_id AND business_id = p_business_id;
  END IF;

  RETURN jsonb_build_object('id', v_sale_id, 'invoice_number', COALESCE(p_invoice_number,''), 'status', v_status, 'duplicate', false);
END;
$$;

-- ---------- 6. RPC: receive_purchase_order (atomic ledger + projection) ----------
CREATE OR REPLACE FUNCTION receive_purchase_order(p_po_id uuid, p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_po record; v_item record;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id AND business_id = p_business_id FOR UPDATE;
  IF v_po IS NULL THEN RAISE EXCEPTION 'PO tidak ditemukan'; END IF;
  IF v_po.status = 'received' THEN RAISE EXCEPTION 'PO sudah diterima sebelumnya'; END IF;
  UPDATE purchase_orders SET status='received', updated_at=now() WHERE id=p_po_id;
  FOR v_item IN SELECT product_id, SUM(qty)::int AS qty, MIN(price) AS unit_cost FROM purchase_order_items WHERE po_id=p_po_id GROUP BY product_id LOOP
    INSERT INTO product_stock (product_id, warehouse_id, quantity) VALUES (v_item.product_id, v_po.warehouse_id, v_item.qty)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = product_stock.quantity + EXCLUDED.quantity, updated_at=now();
    INSERT INTO stock_movements (business_id, warehouse_id, product_id, source_type, source_id, quantity_delta, unit_cost, type, qty, reference_type, reference_id)
    VALUES (p_business_id, v_po.warehouse_id, v_item.product_id, 'purchase', p_po_id, v_item.qty, COALESCE(v_item.unit_cost,0), 'purchase', v_item.qty, 'purchase', p_po_id);
  END LOOP;
  RETURN jsonb_build_object('id', p_po_id, 'status','received');
END;
$$;

-- ---------- 7. RPC: record_stock_adjustment (opname/adjustment/reversal ledger) ----------
CREATE OR REPLACE FUNCTION record_stock_adjustment(
  p_business_id  uuid,
  p_warehouse_id uuid,
  p_product_id   uuid,
  p_quantity_delta integer,
  p_source_type  text DEFAULT 'adjustment',
  p_source_id    uuid DEFAULT NULL,
  p_unit_cost    numeric DEFAULT 0,
  p_created_by   uuid DEFAULT NULL,
  p_notes        text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid; v_stock integer;
BEGIN
  IF p_source_type NOT IN ('adjustment','opname','reversal') THEN RAISE EXCEPTION 'source_type must be adjustment/opname/reversal'; END IF;
  IF p_quantity_delta = 0 THEN RAISE EXCEPTION 'quantity_delta cannot be 0'; END IF;
  SELECT quantity INTO v_stock FROM product_stock WHERE product_id=p_product_id AND warehouse_id=p_warehouse_id FOR UPDATE;
  IF v_stock IS NULL THEN
    IF p_quantity_delta < 0 THEN RAISE EXCEPTION 'Stok tidak mencukupi untuk adjustment'; END IF;
    INSERT INTO product_stock (product_id, warehouse_id, quantity) VALUES (p_product_id, p_warehouse_id, p_quantity_delta);
  ELSE
    IF v_stock + p_quantity_delta < 0 THEN RAISE EXCEPTION 'Stok tidak mencukupi: % + % < 0', v_stock, p_quantity_delta; END IF;
    UPDATE product_stock SET quantity = quantity + p_quantity_delta, updated_at=now() WHERE product_id=p_product_id AND warehouse_id=p_warehouse_id;
  END IF;
  INSERT INTO stock_movements (business_id, warehouse_id, product_id, source_type, source_id, quantity_delta, unit_cost, created_by, type, qty, reference_type, reference_id, notes)
  VALUES (p_business_id, p_warehouse_id, p_product_id, p_source_type, p_source_id, p_quantity_delta, COALESCE(p_unit_cost,0), p_created_by,
    CASE WHEN p_quantity_delta > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END, ABS(p_quantity_delta), p_source_type, p_source_id, p_notes)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------- 8. Grants ----------
GRANT EXECUTE ON FUNCTION process_sale(uuid,uuid,uuid,uuid,uuid,text,numeric,numeric,numeric,uuid,jsonb,jsonb,int,int,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION receive_purchase_order(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_stock_adjustment(uuid,uuid,uuid,integer,text,uuid,numeric,uuid,text) TO authenticated, service_role;
