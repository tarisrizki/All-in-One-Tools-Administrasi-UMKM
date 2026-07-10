import {
	pgTable,
	uuid,
	varchar,
	text,
	jsonb,
	timestamp,
	index,
	foreignKey,
	unique,
	boolean,
	integer,
	numeric,
	date,
	primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const businesses = pgTable("businesses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	address: text(),
	phone: varchar({ length: 30 }),
	businessType: varchar("business_type", { length: 100 }),
	logoUrl: text("logo_url"),
	plan: varchar({ length: 50 }).default("free").notNull(),
	settings: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
});

export const users = pgTable(
	"users",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		roleId: uuid("role_id").notNull(),
		name: varchar({ length: 255 }).notNull(),
		email: varchar({ length: 255 }),
		phone: varchar({ length: 30 }),
		passwordHash: varchar("password_hash", { length: 255 }).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		lastLoginAt: timestamp("last_login_at", {
			withTimezone: true,
			mode: "string",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_users_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "users_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "users_role_id_fkey",
		}),
		unique("users_email_key").on(table.email),
		unique("users_phone_key").on(table.phone),
	],
);

export const roles = pgTable(
	"roles",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		// Nullable dengan sengaja: 3 role bawaan sistem (owner/admin/cashier)
		// tetap satu baris global dipakai bersama semua business (businessId
		// NULL), sedangkan role custom yang dibuat lewat "Tambah Role" di
		// Pengaturan sekarang terikat ke business pembuatnya.
		businessId: uuid("business_id"),
		name: varchar({ length: 50 }).notNull(),
		description: text(),
		permissions: jsonb().default([]).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	// Dulu: unique(name) GLOBAL -- artinya 2 business berbeda tidak bisa
	// sama-sama punya role custom bernama sama, dan business A bisa melihat
	// (bahkan tanpa sengaja bentrok nama dengan) role custom business B.
	// Sekarang unique per (businessId, name).
	(table) => [unique("roles_business_name_key").on(table.businessId, table.name)],
);

export const categories = pgTable(
	"categories",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: varchar({ length: 255 }).notNull(),
		description: text(),
		sortOrder: integer("sort_order").default(0).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_categories_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "categories_business_id_fkey",
		}).onDelete("cascade"),
		unique("categories_business_id_name_key").on(table.businessId, table.name),
	],
);

export const products = pgTable(
	"products",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		categoryId: uuid("category_id"),
		sku: varchar({ length: 100 }),
		barcode: varchar({ length: 100 }),
		name: varchar({ length: 255 }).notNull(),
		description: text(),
		unit: varchar({ length: 50 }).default("pcs").notNull(),
		costPrice: numeric("cost_price", { precision: 14, scale: 2 })
			.default("0")
			.notNull(),
		sellPrice: numeric("sell_price", { precision: 14, scale: 2 })
			.default("0")
			.notNull(),
		minStock: integer("min_stock").default(5).notNull(),
		imageUrl: text("image_url"),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_products_barcode").using(
			"btree",
			table.businessId.asc().nullsLast().op("text_ops"),
			table.barcode.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_products_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_products_category").using(
			"btree",
			table.categoryId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "products_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "products_category_id_fkey",
		}).onDelete("set null"),
		unique("products_business_id_barcode_key").on(
			table.businessId,
			table.barcode,
		),
	],
);

export const warehouses = pgTable(
	"warehouses",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: varchar({ length: 255 }).notNull(),
		address: text(),
		isDefault: boolean("is_default").default(false).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_warehouses_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "warehouses_business_id_fkey",
		}).onDelete("cascade"),
		unique("warehouses_business_id_name_key").on(table.businessId, table.name),
	],
);

export const sales = pgTable(
	"sales",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		warehouseId: uuid("warehouse_id").notNull(),
		customerId: uuid("customer_id"),
		clientTransactionId: uuid("client_transaction_id").notNull(),
		invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
		subtotal: numeric({ precision: 14, scale: 2 }).default("0").notNull(),
		discountTotal: numeric("discount_total", { precision: 14, scale: 2 })
			.default("0")
			.notNull(),
		grandTotal: numeric("grand_total", { precision: 14, scale: 2 })
			.default("0")
			.notNull(),
		status: varchar({ length: 50 }).default("paid").notNull(),
		createdBy: uuid("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_sales_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_sales_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "sales_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "sales_warehouse_id_fkey",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "sales_created_by_fkey",
		}),
		unique("sales_business_id_client_transaction_id_key").on(
			table.businessId,
			table.clientTransactionId,
		),
		unique("sales_business_id_invoice_number_key").on(
			table.businessId,
			table.invoiceNumber,
		),
	],
);

export const saleItems = pgTable(
	"sale_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		saleId: uuid("sale_id").notNull(),
		productId: uuid("product_id").notNull(),
		qty: integer().default(1).notNull(),
		price: numeric({ precision: 14, scale: 2 }).default("0").notNull(),
		discount: numeric({ precision: 14, scale: 2 }).default("0").notNull(),
	},
	(table) => [
		index("idx_sale_items_sale_id").using(
			"btree",
			table.saleId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "sale_items_sale_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "sale_items_product_id_fkey",
		}).onDelete("restrict"),
	],
);

export const payments = pgTable(
	"payments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		saleId: uuid("sale_id").notNull(),
		method: varchar({ length: 50 }).notNull(),
		amount: numeric({ precision: 14, scale: 2 }).default("0").notNull(),
		reference: varchar({ length: 255 }),
		paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_payments_sale_id").using(
			"btree",
			table.saleId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "payments_sale_id_fkey",
		}).onDelete("cascade"),
	],
);

export const cashbookEntries = pgTable(
	"cashbook_entries",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		type: varchar({ length: 20 }).notNull(),
		category: varchar({ length: 100 }).notNull(),
		amount: numeric({ precision: 14, scale: 2 }).default("0").notNull(),
		note: text(),
		entryDate: date("entry_date").default(sql`CURRENT_DATE`).notNull(),
		createdBy: uuid("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_cashbook_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_cashbook_entry_date").using(
			"btree",
			table.entryDate.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "cashbook_entries_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "cashbook_entries_created_by_fkey",
		}),
	],
);

export const suppliers = pgTable(
	"suppliers",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: varchar({ length: 255 }).notNull(),
		contactName: varchar("contact_name", { length: 255 }),
		phone: varchar({ length: 30 }),
		address: text(),
		email: varchar({ length: 255 }),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_suppliers_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "suppliers_business_id_fkey",
		}).onDelete("cascade"),
	],
);

export const purchaseOrders = pgTable(
	"purchase_orders",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		warehouseId: uuid("warehouse_id").notNull(),
		supplierId: uuid("supplier_id").notNull(),
		poNumber: varchar("po_number", { length: 100 }).notNull(),
		status: varchar({ length: 50 }).default("draft").notNull(),
		totalAmount: numeric("total_amount", { precision: 14, scale: 2 })
			.default("0")
			.notNull(),
		expectedDate: date("expected_date"),
		notes: text(),
		createdBy: uuid("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_purchase_orders_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_purchase_orders_status").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
			table.status.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "purchase_orders_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "purchase_orders_warehouse_id_fkey",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "purchase_orders_supplier_id_fkey",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "purchase_orders_created_by_fkey",
		}),
		unique("purchase_orders_business_id_po_number_key").on(
			table.businessId,
			table.poNumber,
		),
	],
);

export const purchaseOrderItems = pgTable(
	"purchase_order_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		poId: uuid("po_id").notNull(),
		productId: uuid("product_id").notNull(),
		qty: integer().default(1).notNull(),
		costPrice: numeric("cost_price", { precision: 14, scale: 2 })
			.default("0")
			.notNull(),
	},
	(table) => [
		index("idx_po_items_po_id").using(
			"btree",
			table.poId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_items_po_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "purchase_order_items_product_id_fkey",
		}).onDelete("restrict"),
	],
);

export const debts = pgTable(
	"debts",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		type: varchar({ length: 20 }).notNull(),
		entityName: varchar("entity_name", { length: 255 }).notNull(),
		entityPhone: varchar("entity_phone", { length: 30 }),
		amount: numeric({ precision: 14, scale: 2 }).default("0").notNull(),
		remainingAmount: numeric("remaining_amount", { precision: 14, scale: 2 })
			.default("0")
			.notNull(),
		dueDate: date("due_date"),
		status: varchar({ length: 20 }).default("unpaid").notNull(),
		notes: text(),
		createdBy: uuid("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_debts_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_debts_status").using(
			"btree",
			table.businessId.asc().nullsLast().op("text_ops"),
			table.status.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "debts_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "debts_created_by_fkey",
		}),
	],
);

export const debtPayments = pgTable(
	"debt_payments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		debtId: uuid("debt_id").notNull(),
		amount: numeric({ precision: 14, scale: 2 }).default("0").notNull(),
		paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
		paymentDate: timestamp("payment_date", {
			withTimezone: true,
			mode: "string",
		})
			.defaultNow()
			.notNull(),
		notes: text(),
		createdBy: uuid("created_by").notNull(),
	},
	(table) => [
		index("idx_debt_payments_debt_id").using(
			"btree",
			table.debtId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.debtId],
			foreignColumns: [debts.id],
			name: "debt_payments_debt_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "debt_payments_created_by_fkey",
		}),
	],
);

export const customers = pgTable(
	"customers",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		businessId: uuid("business_id").notNull(),
		name: varchar({ length: 255 }).notNull(),
		phone: varchar({ length: 50 }),
		email: varchar({ length: 255 }),
		address: text(),
		loyaltyPoints: integer("loyalty_points").default(0).notNull(),
		createdBy: uuid("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_customers_business_id").using(
			"btree",
			table.businessId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "customers_business_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "customers_created_by_fkey",
		}),
	],
);

export const productStock = pgTable(
	"product_stock",
	{
		productId: uuid("product_id").notNull(),
		warehouseId: uuid("warehouse_id").notNull(),
		quantity: integer().default(0).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_stock_product_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "product_stock_warehouse_id_fkey",
		}).onDelete("cascade"),
		primaryKey({
			columns: [table.productId, table.warehouseId],
			name: "product_stock_pkey",
		}),
	],
);
