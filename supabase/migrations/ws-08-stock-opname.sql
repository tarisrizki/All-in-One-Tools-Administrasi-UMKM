-- WS-08: Stock Opname & Adjustment Flow
-- Creates stock_opnames, stock_opname_items tables and RPC functions

-- ---------- Stock Movements Ledger ----------
CREATE TABLE IF NOT EXISTS stock_movements (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warehouse_id    uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('sale', 'purchase', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out')),
  qty             integer NOT NULL,
  reference_type  text,
  reference_id    uuid,
  notes           text,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz DEFAULT now()
);

-- ---------- Stock Opname ----------
CREATE TABLE IF NOT EXISTS stock_opnames (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warehouse_id    uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'counted', 'approved', 'cancelled')),
  counted_at      timestamptz,
  approved_by     uuid REFERENCES users(id),
  reason          text,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  opname_id     uuid NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  system_qty    integer NOT NULL DEFAULT 0,
  counted_qty   integer NOT NULL DEFAULT 0,
  variance      integer GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  created_at    timestamptz DEFAULT now()
);

-- ---------- RLS Enable ----------
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;

-- ---------- Service Role Full Access ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_movements','stock_opnames','stock_opname_items'] LOOP
    DROP POLICY IF EXISTS "Service Role Full Access" ON %I;
    EXECUTE format(
      'CREATE POLICY "Service Role Full Access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ---------- User-scoped RLS Policies ----------
DO $$
DECLARE
  t TEXT;
  user_col TEXT;
  pairs  TEXT[] := ARRAY[
    'stock_movements|business_id|business_id',
    'stock_opnames|business_id|business_id'
  ];
  pair TEXT;
  src_col TEXT;
  filter_col TEXT;
BEGIN
  FOREACH pair IN ARRAY pairs LOOP
    src_col := split_part(pair, '|', 1);
    filter_col := split_part(pair, '|', 2);
    EXECUTE format('DROP POLICY IF EXISTS "User Business Scope" ON %I', src_col);
    EXECUTE format(
      'CREATE POLICY "User Business Scope" ON %I FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = %I))',
      src_col, filter_col
    );
  END LOOP;
  -- stock_opname_items has no business_id; scope via parent opname
  DROP POLICY IF EXISTS "User Business Scope" ON stock_opname_items;
  CREATE POLICY "User Business Scope" ON stock_opname_items FOR ALL USING (
    opname_id IN (SELECT id FROM stock_opnames WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
  ) WITH CHECK (
    opname_id IN (SELECT id FROM stock_opnames WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
  );
END $$;

-- ---------- RPC: approve_stock_opname (atomic adjustment) ----------
CREATE OR REPLACE FUNCTION approve_stock_opname(
  p_opname_id     uuid,
  p_business_id   uuid,
  p_approved_by   uuid,
  p_reason        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname    record;
  v_item      record;
  v_variance  integer;
  v_movement  uuid;
BEGIN
  -- Lock and validate opname
  SELECT * INTO v_opname FROM stock_opnames
  WHERE id = p_opname_id AND business_id = p_business_id
  FOR UPDATE;

  IF v_opname IS NULL THEN
    RAISE EXCEPTION 'Stock opname tidak ditemukan';
  END IF;
  IF v_opname.status = 'approved' THEN
    RAISE EXCEPTION 'Stock opname sudah disetujui sebelumnya';
  END IF;
  IF v_opname.status = 'cancelled' THEN
    RAISE EXCEPTION 'Stock opname sudah dibatalkan';
  END IF;

  -- Enforce approval reason mandatory
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Alasan persetujuan wajib diisi';
  END IF;

  -- Update opname status
  UPDATE stock_opnames
  SET status = 'approved',
      approved_by = p_approved_by,
      counted_at = now(),
      reason = p_reason,
      updated_at = now()
  WHERE id = p_opname_id;

  -- For each item with variance, create stock_movement and update product_stock
  FOR v_item IN
    SELECT soi.*, ps.quantity as current_qty
    FROM stock_opname_items soi
    LEFT JOIN product_stock ps
      ON ps.product_id = soi.product_id
     AND ps.warehouse_id = v_opname.warehouse_id
    WHERE soi.opname_id = p_opname_id
  LOOP
    v_variance := v_item.counted_qty - v_item.system_qty;

    IF v_variance <> 0 THEN
      -- Insert stock_movement record
      INSERT INTO stock_movements (
        business_id,
        warehouse_id,
        product_id,
        type,
        qty,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES (
        p_business_id,
        v_opname.warehouse_id,
        v_item.product_id,
        CASE WHEN v_variance > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END,
        ABS(v_variance),
        'opname',
        p_opname_id,
        p_reason || ' (Opname: ' || p_opname_id || ')',
        p_approved_by
      ) RETURNING id INTO v_movement;

      -- Update product_stock atomically
      INSERT INTO product_stock (product_id, warehouse_id, quantity)
      VALUES (v_item.product_id, v_opname.warehouse_id, v_item.counted_qty)
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        updated_at = now();
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', p_opname_id,
    'status', 'approved',
    'message', 'Stock opname disetujui dan stok disesuaikan'
  );
END;
$$;

-- ---------- RPC: cancel_stock_opname (reversal) ----------
CREATE OR REPLACE FUNCTION cancel_stock_opname(
  p_opname_id     uuid,
  p_business_id   uuid,
  p_cancelled_by  uuid,
  p_reason        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname    record;
  v_item      record;
  v_variance  integer;
  v_movement  uuid;
BEGIN
  -- Lock and validate opname
  SELECT * INTO v_opname FROM stock_opnames
  WHERE id = p_opname_id AND business_id = p_business_id
  FOR UPDATE;

  IF v_opname IS NULL THEN
    RAISE EXCEPTION 'Stock opname tidak ditemukan';
  END IF;
  IF v_opname.status = 'approved' THEN
    RAISE EXCEPTION 'Stock opname yang sudah disetujui tidak bisa dibatalkan, buat adjustment baru';
  END IF;
  IF v_opname.status = 'cancelled' THEN
    RAISE EXCEPTION 'Stock opname sudah dibatalkan';
  END IF;

  -- Enforce cancellation reason mandatory
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Alasan pembatalan wajib diisi';
  END IF;

  -- Update opname status to cancelled
  UPDATE stock_opnames
  SET status = 'cancelled',
      reason = p_reason,
      updated_at = now()
  WHERE id = p_opname_id;

  -- For each item with variance, create REVERSAL stock_movement (opposite type)
  -- This writes reversal rows so audit trail shows the cancellation
  FOR v_item IN
    SELECT soi.*, ps.quantity as current_qty
    FROM stock_opname_items soi
    LEFT JOIN product_stock ps
      ON ps.product_id = soi.product_id
     AND ps.warehouse_id = v_opname.warehouse_id
    WHERE soi.opname_id = p_opname_id
  LOOP
    v_variance := v_item.counted_qty - v_item.system_qty;

    IF v_variance <> 0 THEN
      -- Insert REVERSAL stock_movement record (opposite of what would have been applied)
      INSERT INTO stock_movements (
        business_id,
        warehouse_id,
        product_id,
        type,
        qty,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES (
        p_business_id,
        v_opname.warehouse_id,
        v_item.product_id,
        CASE WHEN v_variance > 0 THEN 'adjustment_out' ELSE 'adjustment_in' END,
        ABS(v_variance),
        'opname_cancel',
        p_opname_id,
        'Pembatalan: ' || p_reason || ' (Opname: ' || p_opname_id || ')',
        p_cancelled_by
      ) RETURNING id INTO v_movement;

      -- Note: We do NOT revert product_stock here since the opname was never approved
      -- The reversal entries are for audit trail only
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', p_opname_id,
    'status', 'cancelled',
    'message', 'Stock opname dibatalkan, reversal entries dicatat untuk audit'
  );
END;
$$;

-- ---------- RPC: get_stock_opname_report (shrinkage stats) ----------
CREATE OR REPLACE FUNCTION get_stock_opname_report(
  p_business_id   uuid,
  p_start_date    timestamptz DEFAULT NULL,
  p_end_date      timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_variance', COALESCE(SUM(variance), 0),
    'total_gain', COALESCE(SUM(CASE WHEN variance > 0 THEN variance ELSE 0 END), 0),
    'total_shrinkage', COALESCE(SUM(CASE WHEN variance < 0 THEN ABS(variance) ELSE 0 END), 0),
    'opname_count', COUNT(DISTINCT opname_id),
    'item_count', COUNT(*)
  ) INTO v_result
  FROM stock_opname_items soi
  JOIN stock_opnames so ON so.id = soi.opname_id
  WHERE so.business_id = p_business_id
    AND (p_start_date IS NULL OR so.created_at >= p_start_date)
    AND (p_end_date IS NULL OR so.created_at <= p_end_date)
    AND so.status IN ('approved', 'cancelled');

  RETURN v_result;
END;
$$;

-- ---------- Trigger: updated_at ----------
-- stock_movements has no updated_at column — trigger removed (fix CHECK violation)
DROP TRIGGER IF EXISTS trg_updated_at_stock_movements ON stock_movements;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_opnames'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I; '
      'CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t, t, t
    );
  END LOOP;
END $$;