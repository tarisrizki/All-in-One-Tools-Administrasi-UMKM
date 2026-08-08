-- ============================================================
-- RLS + Transaksi SQL untuk All-in-One UMKM
-- Jalankan SELURUH file ini di Supabase SQL Editor.
-- Idempotent-ish: CREATE POLICY akan error jika nama sudah ada —
-- aman dijalankan ulang dengan DROP POLICY IF EXISTS di bawah.
-- ============================================================

-- ---------- 1. RLS: enable di semua tabel ----------
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

-- ---------- 2. Service-role full access (backend bypass) ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'businesses','users','roles','categories','products','product_stock',
    'customers','suppliers','warehouses','sales','sale_items','payments',
    'purchase_orders','purchase_order_items','cashbook_entries','debts','debt_payments'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service Role Full Access" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Service Role Full Access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ---------- 3. Transaksi penjualan atomik ----------
-- Dipanggil dari backend via supabase.rpc('process_sale', {...})
-- Seluruh langkah dalam SATU transaksi DB: gagal satu = rollback semua.
CREATE OR REPLACE FUNCTION process_sale(
  p_business_id uuid,
  p_warehouse_id uuid,
  p_customer_id uuid,
  p_client_transaction_id uuid,
  p_invoice_number text,
  p_subtotal numeric,
  p_discount_total numeric,
  p_grand_total numeric,
  p_created_by uuid,
  p_items jsonb,          -- [{product_id, qty, price, discount}]
  p_payments jsonb,       -- [{method, amount}]
  p_redeem_points int DEFAULT 0,
  p_earned_points int DEFAULT 0,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id uuid;
  v_existing uuid;
  v_item jsonb;
  v_stock numeric;
  v_total_paid numeric := 0;
  v_status text;
  v_points int;
BEGIN
  -- Idempotency
  SELECT id INTO v_existing FROM sales
  WHERE business_id = p_business_id AND client_transaction_id = p_client_transaction_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_existing, 'invoice_number',
      (SELECT invoice_number FROM sales WHERE id = v_existing), 'duplicate', true);
  END IF;

  -- Header
  INSERT INTO sales (business_id, warehouse_id, customer_id, client_transaction_id,
                     invoice_number, subtotal, discount_total, grand_total, created_by, status)
  VALUES (p_business_id, p_warehouse_id, p_customer_id, p_client_transaction_id,
          p_invoice_number, p_subtotal::text, p_discount_total::text, p_grand_total::text,
          p_created_by, 'draft')
  RETURNING id INTO v_sale_id;

  -- Items + stok (kunci baris stok, tolak negatif)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (sale_id, product_id, qty, price, discount)
    VALUES (v_sale_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'qty')::int,
            (v_item->>'price')::numeric,
            (v_item->>'discount')::numeric);

    SELECT quantity INTO v_stock FROM product_stock
    WHERE product_id = (v_item->>'product_id')::uuid AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF v_stock IS NULL OR v_stock < (v_item->>'qty')::int THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk produk %', v_item->>'product_id';
    END IF;

    UPDATE product_stock
    SET quantity = quantity - (v_item->>'qty')::int, updated_at = now()
    WHERE product_id = (v_item->>'product_id')::uuid AND warehouse_id = p_warehouse_id;
  END LOOP;

  -- Payments
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (sale_id, method, amount)
    VALUES (v_sale_id, v_item->>'method', (v_item->>'amount')::numeric);
    v_total_paid := v_total_paid + (v_item->>'amount')::numeric;
  END LOOP;

  -- Status + piutang
  v_status := CASE WHEN v_total_paid >= p_grand_total THEN 'paid' ELSE 'partial' END;
  UPDATE sales SET status = v_status WHERE id = v_sale_id;

  IF v_status <> 'paid' THEN
    INSERT INTO debts (business_id, type, entity_name, entity_phone, amount,
                       remaining_amount, status, notes, created_by)
    VALUES (p_business_id, 'piutang', COALESCE(p_customer_name, 'Pelanggan Umum'),
            p_customer_phone, (p_grand_total - v_total_paid)::text,
            (p_grand_total - v_total_paid)::text, 'unpaid',
            'Piutang transaksi ' || p_invoice_number, p_created_by);
  END IF;

  -- Loyalty
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET loyalty_points = loyalty_points - p_redeem_points + p_earned_points
    WHERE id = p_customer_id AND business_id = p_business_id
    RETURNING loyalty_points INTO v_points;
  END IF;

  RETURN jsonb_build_object('id', v_sale_id, 'invoice_number', p_invoice_number,
                            'status', v_status, 'duplicate', false);
END;
$$;

-- ---------- 4. Penerimaan PO atomik (anti race condition) ----------
CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_po_id uuid,
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_po record;
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
    SELECT product_id, SUM(qty) AS qty FROM purchase_order_items
    WHERE po_id = p_po_id GROUP BY product_id
  LOOP
    INSERT INTO product_stock (product_id, warehouse_id, quantity)
    VALUES (v_item.product_id, v_po.warehouse_id, v_item.qty)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = product_stock.quantity + EXCLUDED.quantity,
                  updated_at = now();
  END LOOP;

  RETURN jsonb_build_object('id', p_po_id, 'status', 'received');
END;
$$;
