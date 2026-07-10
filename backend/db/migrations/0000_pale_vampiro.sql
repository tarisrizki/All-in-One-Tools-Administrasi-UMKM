-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"phone" varchar(30),
	"business_type" varchar(100),
	"logo_url" text,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(30),
	"password_hash" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_phone_key" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_business_id_name_key" UNIQUE("business_id","name")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid,
	"sku" varchar(100),
	"barcode" varchar(100),
	"name" varchar(255) NOT NULL,
	"description" text,
	"unit" varchar(50) DEFAULT 'pcs' NOT NULL,
	"cost_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sell_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"min_stock" integer DEFAULT 5 NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_business_id_barcode_key" UNIQUE("business_id","barcode")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_business_id_name_key" UNIQUE("business_id","name")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"customer_id" uuid,
	"client_transaction_id" uuid NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'paid' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_business_id_client_transaction_id_key" UNIQUE("business_id","client_transaction_id"),
	CONSTRAINT "sales_business_id_invoice_number_key" UNIQUE("business_id","invoice_number")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"method" varchar(50) NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reference" varchar(255),
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashbook_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"category" varchar(100) NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"entry_date" date DEFAULT CURRENT_DATE NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"phone" varchar(30),
	"address" text,
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"po_number" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"expected_date" date,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_business_id_po_number_key" UNIQUE("business_id","po_number")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"cost_price" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"entity_name" varchar(255) NOT NULL,
	"entity_phone" varchar(30),
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"remaining_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"due_date" date,
	"status" varchar(20) DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_stock" (
	"product_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_stock_pkey" PRIMARY KEY("product_id","warehouse_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashbook_entries" ADD CONSTRAINT "cashbook_entries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashbook_entries" ADD CONSTRAINT "cashbook_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_business_id" ON "users" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_categories_business_id" ON "categories" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_barcode" ON "products" USING btree ("business_id" text_ops,"barcode" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_business_id" ON "products" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_warehouses_business_id" ON "warehouses" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_business_id" ON "sales" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_created_at" ON "sales" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_sale_items_sale_id" ON "sale_items" USING btree ("sale_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_payments_sale_id" ON "payments" USING btree ("sale_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cashbook_business_id" ON "cashbook_entries" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cashbook_entry_date" ON "cashbook_entries" USING btree ("entry_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_suppliers_business_id" ON "suppliers" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_business_id" ON "purchase_orders" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_status" ON "purchase_orders" USING btree ("business_id" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_po_items_po_id" ON "purchase_order_items" USING btree ("po_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_debts_business_id" ON "debts" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_debts_status" ON "debts" USING btree ("business_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_debt_payments_debt_id" ON "debt_payments" USING btree ("debt_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_business_id" ON "customers" USING btree ("business_id" uuid_ops);
*/