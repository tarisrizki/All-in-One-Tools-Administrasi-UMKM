import { relations } from "drizzle-orm/relations";
import {
	businesses,
	users,
	roles,
	categories,
	products,
	warehouses,
	sales,
	saleItems,
	payments,
	cashbookEntries,
	suppliers,
	purchaseOrders,
	purchaseOrderItems,
	debts,
	debtPayments,
	customers,
	productStock,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
	business: one(businesses, {
		fields: [users.businessId],
		references: [businesses.id],
	}),
	role: one(roles, {
		fields: [users.roleId],
		references: [roles.id],
	}),
	sales: many(sales),
	cashbookEntries: many(cashbookEntries),
	purchaseOrders: many(purchaseOrders),
	debts: many(debts),
	debtPayments: many(debtPayments),
	customers: many(customers),
}));

export const businessesRelations = relations(businesses, ({ many }) => ({
	users: many(users),
	categories: many(categories),
	products: many(products),
	warehouses: many(warehouses),
	sales: many(sales),
	cashbookEntries: many(cashbookEntries),
	suppliers: many(suppliers),
	purchaseOrders: many(purchaseOrders),
	debts: many(debts),
	customers: many(customers),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
	users: many(users),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	business: one(businesses, {
		fields: [categories.businessId],
		references: [businesses.id],
	}),
	products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
	business: one(businesses, {
		fields: [products.businessId],
		references: [businesses.id],
	}),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id],
	}),
	saleItems: many(saleItems),
	purchaseOrderItems: many(purchaseOrderItems),
	productStocks: many(productStock),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
	business: one(businesses, {
		fields: [warehouses.businessId],
		references: [businesses.id],
	}),
	sales: many(sales),
	purchaseOrders: many(purchaseOrders),
	productStocks: many(productStock),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
	business: one(businesses, {
		fields: [sales.businessId],
		references: [businesses.id],
	}),
	warehouse: one(warehouses, {
		fields: [sales.warehouseId],
		references: [warehouses.id],
	}),
	user: one(users, {
		fields: [sales.createdBy],
		references: [users.id],
	}),
	saleItems: many(saleItems),
	payments: many(payments),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
	sale: one(sales, {
		fields: [saleItems.saleId],
		references: [sales.id],
	}),
	product: one(products, {
		fields: [saleItems.productId],
		references: [products.id],
	}),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
	sale: one(sales, {
		fields: [payments.saleId],
		references: [sales.id],
	}),
}));

export const cashbookEntriesRelations = relations(
	cashbookEntries,
	({ one }) => ({
		business: one(businesses, {
			fields: [cashbookEntries.businessId],
			references: [businesses.id],
		}),
		user: one(users, {
			fields: [cashbookEntries.createdBy],
			references: [users.id],
		}),
	}),
);

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
	business: one(businesses, {
		fields: [suppliers.businessId],
		references: [businesses.id],
	}),
	purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(
	purchaseOrders,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [purchaseOrders.businessId],
			references: [businesses.id],
		}),
		warehouse: one(warehouses, {
			fields: [purchaseOrders.warehouseId],
			references: [warehouses.id],
		}),
		supplier: one(suppliers, {
			fields: [purchaseOrders.supplierId],
			references: [suppliers.id],
		}),
		user: one(users, {
			fields: [purchaseOrders.createdBy],
			references: [users.id],
		}),
		purchaseOrderItems: many(purchaseOrderItems),
	}),
);

export const purchaseOrderItemsRelations = relations(
	purchaseOrderItems,
	({ one }) => ({
		purchaseOrder: one(purchaseOrders, {
			fields: [purchaseOrderItems.poId],
			references: [purchaseOrders.id],
		}),
		product: one(products, {
			fields: [purchaseOrderItems.productId],
			references: [products.id],
		}),
	}),
);

export const debtsRelations = relations(debts, ({ one, many }) => ({
	business: one(businesses, {
		fields: [debts.businessId],
		references: [businesses.id],
	}),
	user: one(users, {
		fields: [debts.createdBy],
		references: [users.id],
	}),
	debtPayments: many(debtPayments),
}));

export const debtPaymentsRelations = relations(debtPayments, ({ one }) => ({
	debt: one(debts, {
		fields: [debtPayments.debtId],
		references: [debts.id],
	}),
	user: one(users, {
		fields: [debtPayments.createdBy],
		references: [users.id],
	}),
}));

export const customersRelations = relations(customers, ({ one }) => ({
	business: one(businesses, {
		fields: [customers.businessId],
		references: [businesses.id],
	}),
	user: one(users, {
		fields: [customers.createdBy],
		references: [users.id],
	}),
}));

export const productStockRelations = relations(productStock, ({ one }) => ({
	product: one(products, {
		fields: [productStock.productId],
		references: [products.id],
	}),
	warehouse: one(warehouses, {
		fields: [productStock.warehouseId],
		references: [warehouses.id],
	}),
}));
