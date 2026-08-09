-- ============================================================
-- WS-05: Order Lifecycle F&B (P1) — idempotent
-- ============================================================
-- Tabel: dining_tables, orders, order_items, order_status_history, kitchen_tickets
-- FK businesses(id), outlets (jika ada), warehouses/business via DO checks
-- Lifecycle: draft -> confirmed -> preparing -> ready -> served -> completed | cancelled
-- ============================================================

-- 0) dining_tables (hindari nama reserved `tables`)
CREATE TABLE IF NOT EXISTS dining_tables (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  outlet_id     uuid,
  code          text NOT NULL,
  label         text,
  capacity      integer CHECK (capacity IS NULL OR capacity > 0),
  is_active     boolean DEFAULT true,
  is_occupied   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(business_id, code)
);
-- outlet_id FK ke outlets jika tabel outlets ada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='outlets') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='dining_tables_outlet_id_fkey' AND table_name='dining_tables') THEN
      BEGIN
        ALTER TABLE dining_tables ADD CONSTRAINT dining_tables_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- 1) orders
CREATE TABLE IF NOT EXISTS orders (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  outlet_id     uuid,
  session_id    uuid REFERENCES pos_sessions(id) ON DELETE SET NULL,
  dining_table_id uuid REFERENCES dining_tables(id) ON DELETE SET NULL,
  table_number  text,
  queue_number  integer,
  order_type    text NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in','takeaway','delivery','preorder')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','preparing','ready','served','completed','cancelled')),
  service_fee   numeric NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  deposit       numeric NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  subtotal      numeric NOT NULL DEFAULT 0,
  grand_total   numeric NOT NULL DEFAULT 0,
  customer_id   uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  notes         text,
  sale_id       uuid REFERENCES sales(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='outlets') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='orders_outlet_id_fkey' AND table_name='orders') THEN
      BEGIN
        ALTER TABLE orders ADD CONSTRAINT orders_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- 1b) safe expand for legacy orders(id) only (portal) — ADD COLUMN IF NOT EXISTS per zero-downtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='business_id') THEN ALTER TABLE orders ADD COLUMN business_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='outlet_id') THEN ALTER TABLE orders ADD COLUMN outlet_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='session_id') THEN ALTER TABLE orders ADD COLUMN session_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='table_number') THEN ALTER TABLE orders ADD COLUMN table_number text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='order_type') THEN ALTER TABLE orders ADD COLUMN order_type text DEFAULT 'dine_in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status') THEN ALTER TABLE orders ADD COLUMN status text DEFAULT 'draft'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='subtotal') THEN ALTER TABLE orders ADD COLUMN subtotal numeric DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='grand_total') THEN ALTER TABLE orders ADD COLUMN grand_total numeric DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_id') THEN ALTER TABLE orders ADD COLUMN customer_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_name') THEN ALTER TABLE orders ADD COLUMN customer_name text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_phone') THEN ALTER TABLE orders ADD COLUMN customer_phone text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='notes') THEN ALTER TABLE orders ADD COLUMN notes text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='created_by') THEN ALTER TABLE orders ADD COLUMN created_by uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='created_at') THEN ALTER TABLE orders ADD COLUMN created_at timestamptz DEFAULT now(); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='updated_at') THEN ALTER TABLE orders ADD COLUMN updated_at timestamptz DEFAULT now(); END IF;
END $$;

-- idempotent: tambah kolom jika migrasi lama belum punya
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='dining_table_id') THEN
    ALTER TABLE orders ADD COLUMN dining_table_id uuid REFERENCES dining_tables(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='queue_number') THEN
    ALTER TABLE orders ADD COLUMN queue_number integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='service_fee') THEN
    ALTER TABLE orders ADD COLUMN service_fee numeric NOT NULL DEFAULT 0 CHECK (service_fee >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='deposit') THEN
    ALTER TABLE orders ADD COLUMN deposit numeric NOT NULL DEFAULT 0 CHECK (deposit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='sale_id') THEN
    ALTER TABLE orders ADD COLUMN sale_id uuid REFERENCES sales(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2) order_items
CREATE TABLE IF NOT EXISTS order_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id),
  qty         integer NOT NULL CHECK (qty > 0),
  price       numeric NOT NULL CHECK (price >= 0),
  discount    numeric NOT NULL DEFAULT 0 CHECK (discount >= 0),
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- 2b) safe expand order_items legacy id-only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='order_id') THEN ALTER TABLE order_items ADD COLUMN order_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_id') THEN ALTER TABLE order_items ADD COLUMN product_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='qty') THEN ALTER TABLE order_items ADD COLUMN qty integer CHECK (qty > 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='price') THEN ALTER TABLE order_items ADD COLUMN price numeric CHECK (price >= 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='discount') THEN ALTER TABLE order_items ADD COLUMN discount numeric DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='notes') THEN ALTER TABLE order_items ADD COLUMN notes text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='created_at') THEN ALTER TABLE order_items ADD COLUMN created_at timestamptz DEFAULT now(); END IF;
END $$;

-- 3) order_status_history
CREATE TABLE IF NOT EXISTS order_status_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status  text,
  new_status  text NOT NULL,
  changed_by  uuid REFERENCES users(id),
  changed_at  timestamptz DEFAULT now()
);

-- 4) kitchen_tickets (KDS-ready)
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','printed','preparing','ready','served','cancelled')),
  items_snapshot jsonb DEFAULT '[]'::jsonb,
  instruction   text,
  is_sent       boolean DEFAULT false,
  printed_at    timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(business_id, ticket_number)
);

-- 4b) ensure outlet_id on dining_tables idempotent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dining_tables' AND column_name='outlet_id') THEN
    ALTER TABLE dining_tables ADD COLUMN outlet_id uuid;
  END IF;
END $$;

-- 5) indexes
CREATE INDEX IF NOT EXISTS idx_dining_tables_business_id ON dining_tables(business_id);
CREATE INDEX IF NOT EXISTS idx_dining_tables_outlet_id ON dining_tables(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON orders(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_dining_table_id ON orders(dining_table_id) WHERE dining_table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_queue_number ON orders(business_id, queue_number) WHERE queue_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order_id ON kitchen_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_business_id ON kitchen_tickets(business_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON kitchen_tickets(status);

-- 6) updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at_orders() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at_orders();
DROP TRIGGER IF EXISTS trg_dining_tables_updated_at ON dining_tables;
CREATE TRIGGER trg_dining_tables_updated_at BEFORE UPDATE ON dining_tables FOR EACH ROW EXECUTE FUNCTION set_updated_at_orders();
DROP TRIGGER IF EXISTS trg_kitchen_tickets_updated_at ON kitchen_tickets;
CREATE TRIGGER trg_kitchen_tickets_updated_at BEFORE UPDATE ON kitchen_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at_orders();

-- 7) RLS
ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_tickets ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['dining_tables','orders','order_items','order_status_history','kitchen_tickets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service Role Full Access" ON %I', t);
    EXECUTE format('CREATE POLICY "Service Role Full Access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "User Business Scope" ON dining_tables;
CREATE POLICY "User Business Scope" ON dining_tables FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid())) WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "User Business Scope" ON orders;
CREATE POLICY "User Business Scope" ON orders FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid())) WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- order_items scoped via parent order
DROP POLICY IF EXISTS "User Business Scope" ON order_items;
CREATE POLICY "User Business Scope" ON order_items FOR ALL USING (
  order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
) WITH CHECK (
  order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "User Business Scope" ON order_status_history;
CREATE POLICY "User Business Scope" ON order_status_history FOR ALL USING (
  order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
) WITH CHECK (
  order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "User Business Scope" ON kitchen_tickets;
CREATE POLICY "User Business Scope" ON kitchen_tickets FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid())) WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- 8) RPC: convert_order_to_sale (idempotent, potong stok sekali via process_sale)
CREATE OR REPLACE FUNCTION convert_order_to_sale(
  p_order_id    uuid,
  p_business_id uuid,
  p_created_by  uuid,
  p_warehouse_id uuid DEFAULT NULL,
  p_payments    jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order       record;
  v_wh_id       uuid;
  v_sale_id     uuid;
  v_items       jsonb;
  v_payments    jsonb;
  v_subtotal    numeric := 0;
  v_grand       numeric := 0;
  v_result      jsonb;
  v_inv         text;
  v_count       bigint;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND business_id = p_business_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF v_order.status = 'cancelled' THEN RAISE EXCEPTION 'Order sudah dibatalkan'; END IF;
  IF v_order.status = 'completed' OR v_order.sale_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_order.sale_id, 'order_id', v_order.id, 'duplicate', true, 'status','completed');
  END IF;

  -- warehouse
  IF p_warehouse_id IS NOT NULL THEN v_wh_id := p_warehouse_id;
  ELSE
    SELECT id INTO v_wh_id FROM warehouses WHERE business_id = p_business_id AND is_default = true LIMIT 1;
    IF v_wh_id IS NULL THEN SELECT id INTO v_wh_id FROM warehouses WHERE business_id = p_business_id LIMIT 1; END IF;
    IF v_wh_id IS NULL THEN RAISE EXCEPTION 'Gudang tidak ditemukan'; END IF;
  END IF;

  -- build items jsonb untuk process_sale (price sudah disimpan di order_items)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty, 'price', price, 'discount', discount)), '[]'::jsonb)
    INTO v_items FROM order_items WHERE order_id = p_order_id;
  IF jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'Order tidak memiliki item'; END IF;

  -- hitung subtotal + grand_total (service_fee masuk grand)
  SELECT COALESCE(SUM(price*qty - discount*qty),0) INTO v_subtotal FROM order_items WHERE order_id = p_order_id;
  v_grand := v_subtotal + COALESCE(v_order.service_fee,0);

  -- payments: jika tidak dikirim, anggap lunas cash sejumlah grand_total - deposit
  IF p_payments IS NULL OR jsonb_array_length(p_payments)=0 THEN
    v_payments := jsonb_build_array(jsonb_build_object('method','cash','amount', GREATEST(v_grand - COALESCE(v_order.deposit,0),0)));
  ELSE
    v_payments := p_payments;
  END IF;

  SELECT count(*) INTO v_count FROM sales WHERE business_id = p_business_id;
  v_inv := 'INV/' || to_char(now(),'YYYYMM') || '/' || lpad((v_count+1)::text,5,'0') || '-' || substr(gen_random_uuid()::text,1,6);

  SELECT process_sale(
    p_business_id, v_wh_id, v_order.customer_id, v_order.session_id, gen_random_uuid(), v_inv,
    v_subtotal, 0, v_grand, p_created_by, v_items, v_payments, 0, 0, v_order.customer_name, v_order.customer_phone
  ) INTO v_result;

  v_sale_id := (v_result->>'id')::uuid;

  UPDATE orders SET status='completed', sale_id=v_sale_id, grand_total=v_grand, subtotal=v_subtotal, updated_at=now()
    WHERE id=p_order_id;

  -- occupy -> release table
  IF v_order.dining_table_id IS NOT NULL THEN
    UPDATE dining_tables SET is_occupied=false, updated_at=now() WHERE id=v_order.dining_table_id;
  END IF;

  INSERT INTO order_status_history(order_id, old_status, new_status, changed_by) VALUES (p_order_id, v_order.status, 'completed', p_created_by);

  -- kitchen ticket -> served
  UPDATE kitchen_tickets SET status='served', updated_at=now() WHERE order_id=p_order_id AND status IN ('pending','printed','preparing','ready');

  RETURN jsonb_build_object('id', v_sale_id, 'order_id', p_order_id, 'invoice_number', v_result->>'invoice_number', 'status','completed','duplicate', false);
END;
$$;

-- 9) helper: next_queue_number per business per hari (optional)
CREATE OR REPLACE FUNCTION next_queue_number(p_business_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
  SELECT COALESCE(MAX(queue_number),0)+1 INTO n FROM orders WHERE business_id=p_business_id AND created_at::date = CURRENT_DATE;
  RETURN n;
END; $$;
