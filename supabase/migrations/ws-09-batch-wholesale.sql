-- ============================================================\
-- WS-09: Batch/Expiry + Wholesale (P2)
-- Jalankan di Supabase SQL Editor. Idempotent: DROP IF EXISTS + CREATE IF NOT EXISTS.
-- ============================================================\

-- ---------- 0. Optional: add batch_number, expiry_date to purchase_order_items ----------
-- (Jika belum ada kolom ini di tabel purchase_order_items)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_items' AND column_name = 'batch_number') THEN
    ALTER TABLE purchase_order_items ADD COLUMN batch_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_items' AND column_name = 'expiry_date') THEN
    ALTER TABLE purchase_order_items ADD COLUMN expiry_date date;
  END IF;
END $$;

-- ---------- 1. Tabel product_batches ----------
CREATE TABLE IF NOT EXISTS product_batches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  purchase_item_id uuid REFERENCES purchase_order_items(id) NULL,
  batch_number    text NOT NULL,
  expiry_date     date NOT NULL,
  quantity        int NOT NULL DEFAULT 0,
  unit_cost       numeric NOT NULL DEFAULT 0,
  received_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_batches_business_id ON product_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_business_product ON product_batches(business_id, product_id);

ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

-- RLS: hanya admin/owner bisa manajemen batch, dan owner bisa baca semua batch
DO $$
BEGIN
  -- Hanya admin/owner bisa manajemen (insert/update/delete)
  DROP POLICY IF EXISTS "product_batches_admin_write" ON product_batches;
  EXECUTE format(
    'CREATE POLICY "product_batches_admin_write" ON product_batches FOR ALL
     TO admin USING (true) WITH CHECK (true)'
  );

  -- Owner bisa baca semua, admin baca semua, manajer baca milik bisnis
  DROP POLICY IF EXISTS "product_batches_select" ON product_batches;
  EXECUTE format(
    'CREATE POLICY "product_batches_select" ON product_batches FOR SELECT
     USING (
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND business_id = business_id)
       OR business_id = (SELECT business_id FROM users WHERE id = auth.uid())
     )'
  );
END $$;

-- ---------- 2. Tabel price_lists ----------
CREATE TABLE IF NOT EXISTS price_lists (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_lists_business_id ON price_lists(business_id);

ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "price_lists_admin_write" ON price_lists;
  EXECUTE format(
    'CREATE POLICY "price_lists_admin_write" ON price_lists FOR ALL
     TO admin USING (true) WITH CHECK (true)'
  );

  DROP POLICY IF EXISTS "price_lists_select" ON price_lists;
  EXECUTE format(
    'CREATE POLICY "price_lists_select" ON price_lists FOR SELECT
     USING (
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND business_id = business_id)
       OR business_id = (SELECT business_id FROM users WHERE id = auth.uid())
     )'
  );
END $$;

-- ---------- 3. Tabel price_list_items ----------
CREATE TABLE IF NOT EXISTS price_list_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  price_list_id uuid NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty     int NOT NULL DEFAULT 0,
  price       numeric NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list_id ON price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product_id ON price_list_items(product_id);

ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "price_list_items_admin_write" ON price_list_items;
  EXECUTE format(
    'CREATE POLICY "price_list_items_admin_write" ON price_list_items FOR ALL
     TO admin USING (true) WITH CHECK (true)'
  );

  DROP POLICY IF EXISTS "price_list_items_select" ON price_list_items;
  EXECUTE format(
    'CREATE POLICY "price_list_items_select" ON price_list_items FOR SELECT
     USING (
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND business_id = business_id)
       OR business_id = (SELECT business_id FROM users WHERE id = auth.uid())
     )'
  );
END $$;

-- ---------- 4. Helper: update price_list_items price when product qty >= min_qty ----------
-- (Tidak ada trigger di SQL, tapi logika di API handler: harga otomatis saat qty >= min_qty)

-- ---------- 5. RPC: receive_purchase_order (updated with batch support) ----------
-- Purchase receive opsional membuat batch: jika purchase_order_items punya batch_number + expiry_date, buat batch
CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_po_id      uuid,
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po   record;
  v_item record;
  v_batch_count int := 0;
BEGIN
  SELECT * INTO v_po FROM purchase_orders
  WHERE id = p_po_id AND business_id = p_business_id
  FOR UPDATE;

  IF v_po IS NULL THEN
    RAISE EXCEPTION 'PO tidak ditemukan';
  END IF;
  IF v_po.status = 'received' THEN
    RAISE EXCEPTION 'PO sudah diterima sebelumnya';
  END IF;

  UPDATE purchase_orders
  SET status = 'received', updated_at = now()
  WHERE id = p_po_id;

  FOR v_item IN
    SELECT product_id, SUM(qty)::int AS qty, cost_price
    FROM purchase_order_items
    WHERE po_id = p_po_id
    GROUP BY product_id, cost_price
  LOOP
    INSERT INTO product_stock (product_id, warehouse_id, quantity)
    VALUES (v_item.product_id, v_po.warehouse_id, v_item.qty)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity = product_stock.quantity + EXCLUDED.quantity,
      updated_at = now();
  END LOOP;

  -- Buat batch jika purchase_order_items memiliki batch_number dan expiry_date
  FOR v_item IN
    SELECT product_id, qty, cost_price, batch_number, expiry_date
    FROM purchase_order_items
    WHERE po_id = p_po_id
      AND batch_number IS NOT NULL
      AND expiry_date IS NOT NULL
  LOOP
    INSERT INTO product_batches (business_id, product_id, purchase_item_id, batch_number, expiry_date, quantity, unit_cost)
    VALUES (p_business_id, v_item.product_id, v_item.id, v_item.batch_number, v_item.expiry_date, v_item.qty, v_item.cost_price);
    v_batch_count := v_batch_count + 1;
  END LOOP;

  RETURN jsonb_build_object('id', p_po_id, 'status', 'received', 'batches_created', v_batch_count);
END;
$$;

-- ---------- 6. RPC: get_expiring_batches (FEFO) ----------
-- GET /products/expiring?days=30
CREATE OR REPLACE FUNCTION get_expiring_batches(
  p_business_id uuid,
  p_days int DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  product_name text,
  batch_number text,
  expiry_date date,
  quantity int,
  unit_cost numeric,
  received_at timestamptz,
  days_until_expiry int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.product_id,
    p.name AS product_name,
    pb.batch_number,
    pb.expiry_date,
    pb.quantity,
    pb.unit_cost,
    pb.received_at,
    (pb.expiry_date - CURRENT_DATE) AS days_until_expiry
  FROM product_batches pb
  JOIN products p ON p.id = pb.product_id
  WHERE pb.business_id = p_business_id
    AND pb.quantity > 0
    AND pb.expiry_date <= CURRENT_DATE + p_days
    AND pb.expiry_date >= CURRENT_DATE
  ORDER BY pb.expiry_date ASC, pb.received_at ASC; -- FEFO: earliest expiry first
END;
$$;

-- ---------- 6. RPC: consume_batch_fefo (FEFO stock decrease for sales) ----------
-- Mengurangi stok batch secara FEFO (First Expired, First Out)
-- Dipanggil dari process_sale atau API sales untuk setiap item
CREATE OR REPLACE FUNCTION consume_batch_fefo(
  p_business_id uuid,
  p_product_id uuid,
  p_qty int,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS TABLE (
  batch_id uuid,
  batch_number text,
  consumed_qty int,
  unit_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch record;
  v_remaining int := p_qty;
  v_consumed int;
BEGIN
  -- Cari batch dengan quantity > 0, urutkan FEFO (expiry_date ASC, received_at ASC)
  FOR v_batch IN
    SELECT id, batch_number, quantity, unit_cost
    FROM product_batches
    WHERE business_id = p_business_id
      AND product_id = p_product_id
      AND quantity > 0
    ORDER BY expiry_date ASC, received_at ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_consumed := LEAST(v_batch.quantity, v_remaining);

    -- Kurangi quantity di batch
    UPDATE product_batches
    SET quantity = quantity - v_consumed
    WHERE id = v_batch.id;

    -- Return batch yang dikonsumsi
    RETURN QUERY SELECT v_batch.id, v_batch.batch_number, v_consumed, v_batch.unit_cost;

    v_remaining := v_remaining - v_consumed;
  END LOOP;

  -- Jika masih ada sisa qty tapi batch habis -> error (stok tidak mencukupi di batch level)
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Stok batch tidak mencukupi untuk produk % (sisa % unit)', p_product_id, v_remaining;
  END IF;
END;
$$;

-- ---------- 7. RPC: get_applicable_price (Wholesale pricing) ----------
-- Mengambil harga berlaku berdasarkan price_list dan qty (min_qty)
-- Jika qty >= min_qty, pakai price_list price; else pakai products.sell_price

-- ---------- 8. Add batch_id to sale_items for traceability ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'batch_id') THEN
    ALTER TABLE sale_items ADD COLUMN batch_id uuid REFERENCES product_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'price_source') THEN
    ALTER TABLE sale_items ADD COLUMN price_source text DEFAULT 'retail' CHECK (price_source IN ('retail', 'wholesale'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'price_list_name') THEN
    ALTER TABLE sale_items ADD COLUMN price_list_name text;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION get_applicable_price(
  p_business_id uuid,
  p_product_id uuid,
  p_qty int,
  p_price_list_id uuid DEFAULT NULL
)
RETURNS TABLE (
  price numeric,
  source text,
  price_list_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sell_price numeric;
  v_price numeric;
  v_source text := 'retail';
  v_pl_name text := NULL;
BEGIN
  -- Ambil harga retail default
  SELECT sell_price INTO v_sell_price
  FROM products
  WHERE id = p_product_id AND business_id = p_business_id;

  IF v_sell_price IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 'error', 'Produk tidak ditemukan';
    RETURN;
  END IF;

  -- Jika tidak ada price_list_id, cari price_list aktif (bisa di-extend: default price list per business)
  IF p_price_list_id IS NULL THEN
    -- Fallback ke harga retail
    RETURN QUERY SELECT v_sell_price, 'retail', NULL;
    RETURN;
  END IF;

  -- Cek price_list_items untuk produk ini
  SELECT pli.price, pl.name INTO v_price, v_pl_name
  FROM price_list_items pli
  JOIN price_lists pl ON pl.id = pli.price_list_id
  WHERE pli.price_list_id = p_price_list_id
    AND pli.product_id = p_product_id
    AND pli.min_qty <= p_qty
    AND pl.business_id = p_business_id
  ORDER BY pli.min_qty DESC
  LIMIT 1;

  IF v_price IS NOT NULL THEN
    RETURN QUERY SELECT v_price, 'wholesale', v_pl_name;
  ELSE
    RETURN QUERY SELECT v_sell_price, 'retail', NULL;
  END IF;
END;
$$;

-- ---------- 9. Updated RPC: process_sale (atomic, idempotent) ----------
-- Support batch_id, price_source, price_list_name for WS-09
CREATE OR REPLACE FUNCTION process_sale(
  p_business_id           uuid,
  p_warehouse_id          uuid,
  p_customer_id           uuid,
  p_session_id            uuid DEFAULT NULL,
  p_client_transaction_id uuid,
  p_invoice_number        text,
  p_subtotal              numeric,
  p_discount_total        numeric,
  p_grand_total           numeric,
  p_created_by            uuid,
  p_items                 jsonb,
  p_payments              jsonb,
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
  v_stock      numeric;
  v_total_paid numeric := 0;
  v_status     text;
BEGIN
  -- Idempotency
  SELECT id INTO v_existing FROM sales
  WHERE business_id = p_business_id
    AND client_transaction_id = p_client_transaction_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'id', v_existing,
      'invoice_number', (SELECT invoice_number FROM sales WHERE id = v_existing),
      'duplicate', true
    );
  END IF;

  -- Insert sale header
  INSERT INTO sales (
    business_id, warehouse_id, customer_id, session_id, client_transaction_id,
    invoice_number, subtotal, discount_total, grand_total,
    created_by, status
  ) VALUES (
    p_business_id, p_warehouse_id, p_customer_id, p_session_id, p_client_transaction_id,
    p_invoice_number, p_subtotal::text, p_discount_total::text, p_grand_total::text,
    p_created_by, 'draft'
  ) RETURNING id INTO v_sale_id;

  -- Insert items + decrement stock (lock row to prevent oversell)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (sale_id, product_id, qty, price, discount, batch_id, price_source, price_list_name)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'qty')::int,
      (v_item->>'price')::numeric,
      COALESCE((v_item->>'discount')::numeric, 0),
      CASE WHEN v_item ? 'batch_id' THEN (v_item->>'batch_id')::uuid ELSE NULL END,
      COALESCE(v_item->>'price_source', 'retail'),
      v_item->>'price_list_name'
    );

    SELECT quantity INTO v_stock FROM product_stock
    WHERE product_id = (v_item->>'product_id')::uuid
      AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF v_stock IS NULL OR v_stock < (v_item->>'qty')::int THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk produk %', v_item->>'product_id';
    END IF;

    UPDATE product_stock
    SET quantity = quantity - (v_item->>'qty')::int,
        updated_at = now()
    WHERE product_id = (v_item->>'product_id')::uuid
      AND warehouse_id = p_warehouse_id;
  END LOOP;

  -- Insert payments
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (sale_id, method, amount)
    VALUES (v_sale_id, v_item->>'method', (v_item->>'amount')::numeric);
    v_total_paid := v_total_paid + (v_item->>'amount')::numeric;
  END LOOP;

  -- Determine status
  v_status := CASE WHEN v_total_paid >= p_grand_total THEN 'paid' ELSE 'partial' END;
  UPDATE sales SET status = v_status WHERE id = v_sale_id;

  -- Create debt record if not fully paid
  IF v_status <> 'paid' THEN
    INSERT INTO debts (
      business_id, type, entity_name, entity_phone,
      amount, remaining_amount, status,
      notes, created_by
    ) VALUES (
      p_business_id, 'piutang',
      COALESCE(p_customer_name, 'Pelanggan Umum'),
      p_customer_phone,
      (p_grand_total - v_total_paid)::text,
      (p_grand_total - v_total_paid)::text,
      'unpaid',
      'Piutang transaksi ' || p_invoice_number,
      p_created_by
    );
  END IF;

  -- Update loyalty points
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET loyalty_points = loyalty_points - p_redeem_points + p_earned_points
    WHERE id = p_customer_id AND business_id = p_business_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_sale_id,
    'invoice_number', p_invoice_number,
    'status', v_status,
    'duplicate', false
  );
END;
$$;

-- ---------- 5. RLS - Tabel product_batches, price_lists, price_list_items ----------
-- Tabel ini sudah punya RLS di atas.