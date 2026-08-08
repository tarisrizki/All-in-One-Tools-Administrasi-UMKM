-- ============================================================
-- WS-05: Order Lifecycle F&B (P1)
-- Schema creation for order lifecycle, table management, kitchen tickets
-- ============================================================
-- 1. Table: orders
--   id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   business_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
--   outlet_id         uuid REFERENCES outlets(id)   -- optional assignment
--   session_id        uuid REFERENCES pos_sessions(id) ON DELETE SET NULL
--   order_type        text CHECK (order_type IN ('dine_in','takeaway','delivery','preorder'))
--   status            text    DEFAULT 'draft' CHECK (status IN ('draft','confirmed','preparing','ready','served','completed','cancelled'))
--   table_number      text        -- for restaurant table identifier
--   queue_number      integer   -- position in serving queue
--   service_fee       numeric   DEFAULT 0
--   deposit           numeric   DEFAULT 0
--   created_by        uuid REFERENCES users(id)
--   created_at        timestamptz DEFAULT now()
--   updated_at        timestamptz
--   CONSTRAINT chk_service_fee CHECK (service_fee >= 0)
--   CONSTRAINT chk_deposit    CHECK (deposit    >= 0)

-- 2. Table: order_items
--   id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
--   product_id        uuid NOT NULL REFERENCES products(id)
--   quantity          integer NOT NULL CHECK (quantity > 0)
--   unit_price        numeric NOT NULL
--   total_price       numeric GENERATED ALWAYS AS (quantity * unit_price) STORED
--   is_modifier       boolean DEFAULT false

-- 3. Table: order_status_history
--   id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
--   new_status        text NOT NULL
--   changed_at        timestamptz DEFAULT now()
--   changed_by        uuid REFERENCES users(id)

-- 4. Table: tables (restaurant layout)
--   id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   outlet_id         uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE
--   table_number      text NOT NULL UNIQUE
--   capacity          integer
--   description       text
--   is_active         boolean DEFAULT true

-- 5. Table: kitchen_tickets
--   id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
--   ticket_number     integer NOT NULL                 -- order of printing
--   printer_id        uuid NOT NULL REFERENCES printers(id)   -- kitchen printer config
--   created_at        timestamptz DEFAULT now()
--   printed_at        timestamptz
--   printed_to_kitchen  boolean DEFAULT false
--   instruction       text                      -- special cooking instructions
--   is_sent           boolean DEFAULT false

-- 6. Table: printers (kitchen printer config)
--   id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   name              text NOT NULL
--   description       text
--   ip_address        text
--   port              integer DEFAULT 9100
--   is_active         boolean DEFAULT true

-- 7. Function: convert_order_to_sale(order_id uuid) -> void
--   Insert a row into sales (via RPC process_sale) using the order's items,
--   calculate totals, insert sale, lock stock, then mark order status='completed'
--   (optional: delete or archive order)

-- 8. Permissions:
--   - Access to orders, order_items, order_status_history restricted to
--     users/business_id via RLS policies (business_id FROM users WHERE id = current_setting('userId')::uuid)
--   - Only users with permission 'orders.manage' may create, update, convert orders.
--   - Only users with permission 'kitchen.print' may create kitchen_tickets.

-- 9. RLS Policies (exemplars):
--   CREATE POLICY "User Order Scope"
--     ON orders
--     FOR ALL
--     USING (business_id IN (SELECT business_id FROM users WHERE id = current_setting('userId')::uuid))
--     WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = current_setting('userId')::uuid));

--   CREATE POLICY "User Order Insert"
--     ON orders FOR INSERT
--     WITH CHECK (same as SELECT policy);

--   ... similar policies for order_items, order_status_history, kitchen_tickets, tables, printers ...

-- 10. Indexes:
--   CREATE INDEX idx_orders_business_id ON orders(business_id);
--   CREATE INDEX idx_orders_status ON orders(status);
--   CREATE INDEX idx_orders_outlet_id ON orders(outlet_id);
--   CREATE INDEX idx_order_items_order_id ON order_items(order_id);
--   CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
--   CREATE INDEX idx_kitchen_tickets_order_id ON kitchen_tickets(order_id);
--   CREATE INDEX idx_tables_outlet_id ON tables(outlet_id);
--   ... etc.

-- ============================================================
-- END OF MIGRATION
-- ============================================================