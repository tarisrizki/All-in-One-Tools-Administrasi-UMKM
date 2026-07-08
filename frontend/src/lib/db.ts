import Dexie, { type Table } from 'dexie';

// Types for our local database tables
export interface LocalProduct {
	id: string;
	businessId: string;
	categoryId: string | null;
	sku: string | null;
	name: string;
	description: string | null;
	price: string | number; // Note: Drizzle returns numeric strings for NUMERIC types, we'll store as string or number
	stock: number;
	minStock: number;
	unit: string;
	barcode: string | null;
	image: string | null;
	isActive: boolean;
	updatedAt: string;
}

export interface LocalCategory {
	id: string;
	businessId: string;
	name: string;
	description: string | null;
	updatedAt: string;
}

export interface LocalCustomer {
	id: string;
	businessId: string;
	name: string;
	phone: string | null;
	email: string | null;
	loyaltyPoints: number;
	tier: string;
	updatedAt: string;
}

export interface PendingTransaction {
	client_transaction_id: string; // UUID v4
	businessId: string;
	customerId: string | null;
	customerName: string | null;
	customerPhone: string | null;
	totalAmount: number;
	discount: number;
	tax: number;
	grandTotal: number;
	payments: { method: string; amount: number }[];
	amountPaid: number;
	changeAmount: number;
	notes: string | null;
	createdAt: string;
	items: {
		productId: string;
		name?: string;
		quantity: number;
		unitPrice: number;
		subtotal: number;
	}[];
	redeemPoints?: number;
}

export class UMKMDatabase extends Dexie {
	products!: Table<LocalProduct>;
	categories!: Table<LocalCategory>;
	customers!: Table<LocalCustomer>;
	pending_transactions!: Table<PendingTransaction>;

	constructor() {
		super('umkm_db');
		
		this.version(2).stores({
			products: 'id, businessId, categoryId, name, sku, barcode, updatedAt',
			categories: 'id, businessId, name, updatedAt',
			customers: 'id, businessId, name, updatedAt',
			pending_transactions: 'client_transaction_id, businessId, createdAt'
		});
	}
}

export const db = new UMKMDatabase();
