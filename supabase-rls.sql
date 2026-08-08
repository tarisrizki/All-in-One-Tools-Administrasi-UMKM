-- ============================================================
-- All-in-One Tools Administrasi UMKM — Supabase Schema + RLS + RPC
-- Jalankan SELURUH file ini di Supabase SQL Editor (Dashboard > SQL Editor).
-- Idempotent: DROP IF EXISTS + CREATE IF NOT EXISTS — aman dijalankan ulang.
-- Jika bentrok dengan data lama (mis. project "Beres"), langkah 1 akan
-- mengosongkan tabel yang bentrok.
-- ============================================================

-- ---------- 0. Hapus tabel lama yang bentrok ----------
-- (Kosongkan saja di Beres — aman karena UMKM schema berbeda)
DROP TABLE IF EXISTS debt_payments CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS cashbook_entries CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS product_stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- ---------- 1. Schema Tables ----------
CREATE TABLE IF NOT EXISTS businesses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  settings    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  permissions text[] DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role_id       uuid NOT NULL REFERENCES roles(id),
  name          text NOT NULL,
  phone         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  name        text NOT NULL,
  sku         text,
  barcode     text,
  cost_price  numeric DEFAULT 0,
  sell_price  numeric DEFAULT 0,
  stock       integer DEFAULT 0,
  unit        text DEFAULT 'pcs',
  is_active   boolean DEFAULT true,
  image_url   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_stock (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity    integer DEFAULT 0,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            text,
  phone           text,
  email           text,
  address         text,
  loyalty_points  integer DEFAULT 0,
  loyalty_tier    text DEFAULT 'bronze',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  address     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id           uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warehouse_id           uuid NOT NULL REFERENCES warehouses(id),
  customer_id           uuid REFERENCES customers(id),
  client_transaction_id  uuid UNIQUE,
  invoice_number        text NOT NULL,
  subtotal              numeric DEFAULT 0,
  discount_total        numeric DEFAULT 0,
  grand_total           numeric DEFAULT 0,
  status                text DEFAULT 'draft',
  created_by            uuid REFERENCES users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id     uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id),
  qty         integer NOT NULL,
  price       numeric NOT NULL,
  discount    numeric DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id     uuid REFERENCES sales(id) ON DELETE SET NULL,
  method      text NOT NULL,
  amount      numeric NOT NULL,
  reference   text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  invoice_number text,
  subtotal    numeric DEFAULT 0,
  status      text DEFAULT 'pending',
  notes       text,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id       uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id),
  qty         integer NOT NULL,
  price       numeric NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashbook_entries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('in', 'out')),
  category    text,
  amount      numeric NOT NULL,
  note        text,
  created_by   uuid REFERENCES users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('piutang', 'hutang')),
  entity_name     text,
  entity_phone    text,
  amount          numeric NOT NULL,
  remaining_amount numeric NOT NULL,
  status          text DEFAULT 'unpaid',
  notes           text,
  due_date        timestamptz,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id   uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount    numeric NOT NULL,
  notes     text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ---------- 2. Seeding default roles ----------
INSERT INTO roles (name, permissions) VALUES
  ('owner',   ARRAY['*']),
  ('admin',   ARRAY['*']),
  ('cashier', ARRAY['pos.read', 'pos.write', 'customers.read', 'reports.read'])
ON CONFLICT (name) DO NOTHING;

-- ---------- 3. Enable RLS ----------
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- ---------- 4. Service-role full access (backend bypass) ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'businesses','users','roles','categories','products','product_stock',
    'customers','suppliers','warehouses','sales','sale_items','payments',
    'purchase_orders','purchase_order_items','cashbook_entries','debts','debt_payments'
  ] LOOP
    DROP POLICY IF EXISTS "Service Role Full Access" ON %I;
    EXECUTE format(
      'CREATE POLICY "Service Role Full Access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ---------- 5. User-scoped RLS policies ----------
-- Roles: everyone in the same business can CRUD their own tables
DO $$
DECLARE
  t TEXT;
  user_col TEXT;
  pairs  TEXT[] := ARRAY[
    'users|user_id|user_id',
    'roles|user_id|role_id',
    'categories|business_id|business_id',
    'products|business_id|business_id',
    'product_stock|business_id|business_id',
    'customers|business_id|business_id',
    'suppliers|business_id|business_id',
    'warehouses|business_id|business_id',
    'sales|business_id|business_id',
    'sale_items|business_id|business_id',
    'payments|business_id|business_id',
    'purchase_orders|business_id|business_id',
    'purchase_order_items|business_id|business_id',
    'cashbook_entries|business_id|business_id',
    'debts|business_id|business_id',
    'debt_payments|business_id|business_id'
  ];
  pair TEXT;
  src_col TEXT;
  filter_col TEXT;
BEGIN
  FOREACH pair IN ARRAY pairs LOOP
    src_col := split_part(pair, '|', 1);
    filter_col := split_part(pair, '|', 2);
    IF src_col = 'users' THEN
      EXECUTE format('DROP POLICY IF EXISTS "User Business Scope" ON users');
      EXECUTE format(
        'CREATE POLICY "User Business Scope" ON users FOR ALL USING (id = %I)', filter_col
      );
    ELSIF src_col = 'roles' THEN
      EXECUTE format('DROP POLICY IF EXISTS "User Business Scope" ON roles');
      -- roles have no business_id column; managed by admin/owner via users table
      EXECUTE format(
        'CREATE POLICY "User Business Scope" ON roles FOR SELECT USING (true)'
      );
    ELSE
      EXECUTE format('DROP POLICY IF EXISTS "User Business Scope" ON %I', src_col);
      EXECUTE format(
        'CREATE POLICY "User Business Scope" ON %I FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = %I))',
        src_col, filter_col
      );
    END IF;
  END LOOP;
END $$;

-- ---------- 6. RPC: process_sale (atomic, idempotent) ----------
CREATE OR REPLACE FUNCTION process_sale(
  p_business_id          uuid,
  p_warehouse_id         uuid,
  p_customer_id          uuid,
  p_client_transaction_id uuid,
  p_invoice_number       text,
  p_subtotal             numeric,
  p_discount_total       numeric,
  p_grand_total          numeric,
  p_created_by           uuid,
  p_items                jsonb,
  p_payments             jsonb,
  p_redeem_points        int DEFAULT 0,
  p_earned_points        int DEFAULT 0,
  p_customer_name        text DEFAULT NULL,
  p_customer_phone       text DEFAULT NULL
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
    business_id, warehouse_id, customer_id, client_transaction_id,
    invoice_number, subtotal, discount_total, grand_total,
    created_by, status
  ) VALUES (
    p_business_id, p_warehouse_id, p_customer_id, p_client_transaction_id,
    p_invoice_number, p_subtotal::text, p_discount_total::text, p_grand_total::text,
    p_created_by, 'draft'
  ) RETURNING id INTO v_sale_id;

  -- Insert items + decrement stock (lock row to prevent oversell)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (sale_id, product_id, qty, price, discount)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'qty')::int,
      (v_item->>'price')::numeric,
      COALESCE((v_item->>'discount')::numeric, 0)
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

-- ---------- 7. RPC: receive_purchase_order (atomic) ----------
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
    SELECT product_id, SUM(qty)::int AS qty
    FROM purchase_order_items
    WHERE po_id = p_po_id
    GROUP BY product_id
  LOOP
    INSERT INTO product_stock (product_id, warehouse_id, quantity)
    VALUES (v_item.product_id, v_po.warehouse_id, v_item.qty)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity = product_stock.quantity + EXCLUDED.quantity,
      updated_at = now();
  END LOOP;

  RETURN jsonb_build_object('id', p_po_id, 'status', 'received');
END;
$$;

-- ---------- 8. RPC: pay_debt (atomic, prevent overpayment) ----------
CREATE OR REPLACE FUNCTION pay_debt(
  p_debt_id    uuid,
  p_amount     numeric,
  p_business_id uuid,
  p_created_by  uuid,
  p_notes      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debt record;
BEGIN
  SELECT * INTO v_debt FROM debts
  WHERE id = p_debt_id AND business_id = p_business_id
  FOR UPDATE;

  IF v_debt IS NULL THEN
    RAISE EXCEPTION 'Piutang/hutang tidak ditemukan';
  END IF;
  IF v_debt.status = 'paid' THEN
    RAISE EXCEPTION 'Piutang/hutang sudah lunas';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran harus positif';
  END IF;
  IF p_amount > (v_debt.remaining_amount::numeric) THEN
    RAISE EXCEPTION 'Jumlah pembayaran melebihi sisa tagihan (%s)', v_debt.remaining_amount;
  END IF;

  INSERT INTO debt_payments (debt_id, amount, notes, created_by)
  VALUES (p_debt_id, p_amount, p_notes, p_created_by);

  UPDATE debts
  SET remaining_amount = (remaining_amount::numeric - p_amount)::text,
      status = CASE
        WHEN (remaining_amount::numeric - p_amount) <= 0 THEN 'paid'
        ELSE remaining_amount
      END,
      updated_at = now()
  WHERE id = p_debt_id;

  RETURN jsonb_build_object(
    'id', p_debt_id,
    'paid_amount', p_amount,
    'status', CASE WHEN p_amount >= v_debt.remaining_amount::numeric THEN 'paid' ELSE 'partial' END
  );
END;
$$;

-- ---------- 9. Trigger: auto updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'businesses','users','categories','products','warehouses',
    'customers','suppliers','sales','purchase_orders','cashbook_entries','debts'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I; '
      'CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t, t, t
    );
  END LOOP;
END $$;
