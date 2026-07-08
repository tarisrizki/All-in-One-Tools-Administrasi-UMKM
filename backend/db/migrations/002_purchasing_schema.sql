-- Migration: 002_purchasing_schema.sql
-- Sprint S6 — Multi-gudang & Pembelian (Purchase Orders)

-- =============================================================
-- SUPPLIERS
-- =============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(30),
  address TEXT,
  email VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_business_id ON suppliers(business_id);

-- =============================================================
-- PURCHASE ORDERS
-- =============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, ordered, received
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(business_id, po_number)
);

CREATE INDEX idx_purchase_orders_business_id ON purchase_orders(business_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(business_id, status);

-- =============================================================
-- PURCHASE ORDER ITEMS
-- =============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1,
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_po_items_po_id ON purchase_order_items(po_id);
