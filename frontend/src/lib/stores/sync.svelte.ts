import { apiClient, getApiUrl } from '$lib/utils/api';
import { db } from '../db.js';
import { authState } from './auth.svelte.js';
import { toast } from 'svelte-sonner';

export const syncState = $state({
	isOnline: true, // We assume online by default, updated on mount
	isSyncing: false,
	lastSyncTime: null as Date | null,
});

export function initSyncManager() {
	if (typeof window === 'undefined') return;

	// Update initial state
	syncState.isOnline = navigator.onLine;

	// Add listeners
	window.addEventListener('online', () => {
		syncState.isOnline = true;
		toast.success('Koneksi terhubung kembali. Memulai sinkronisasi...');
		triggerSync();
	});

	window.addEventListener('offline', () => {
		syncState.isOnline = false;
		toast.warning('Koneksi terputus. Beralih ke mode offline.');
	});

	// Optionally start a periodic sync (e.g. every 5 minutes)
	setInterval(() => {
		if (syncState.isOnline && authState.isAuthenticated) {
			triggerSync();
		}
	}, 5 * 60 * 1000);
}

export async function triggerSync() {
	if (!syncState.isOnline || syncState.isSyncing || !authState.isAuthenticated) return;
	
	syncState.isSyncing = true;
	try {
		await pushPendingTransactions();
		await pullLatestData();
		syncState.lastSyncTime = new Date();
	} catch (error) {
		console.error('Sync failed:', error);
		// Don't show toast for background sync failures unless manually triggered
	} finally {
		syncState.isSyncing = false;
	}
}

async function pushPendingTransactions() {
	const pending = await db.pending_transactions.toArray();
	if (pending.length === 0) return;

	try {
		const res = await apiClient(`/sync/push`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authState.token}`
			},
			body: JSON.stringify({ transactions: pending })
		});

		if (res.ok) {
			// Successfully pushed, remove from local DB
			const ids = pending.map(t => t.client_transaction_id);
			await db.pending_transactions.bulkDelete(ids);
			console.log(`Successfully synced ${ids.length} transactions`);
		} else {
			console.error('Failed to push transactions', await res.text());
		}
	} catch (error) {
		console.error('Network error during push', error);
		throw error;
	}
}

async function pullLatestData() {
	// Let's get the max updatedAt from local DB
	const latestProduct = await db.products.orderBy('updatedAt').last();
	const latestCategory = await db.categories.orderBy('updatedAt').last();
	const latestCustomer = await db.customers.orderBy('updatedAt').last();
	
	let since = '1970-01-01T00:00:00.000Z';
	if (latestProduct?.updatedAt || latestCategory?.updatedAt || latestCustomer?.updatedAt) {
		const pDate = latestProduct?.updatedAt ? new Date(latestProduct.updatedAt).getTime() : 0;
		const cDate = latestCategory?.updatedAt ? new Date(latestCategory.updatedAt).getTime() : 0;
		const cuDate = latestCustomer?.updatedAt ? new Date(latestCustomer.updatedAt).getTime() : 0;
		since = new Date(Math.max(pDate, cDate, cuDate)).toISOString();
	}

	try {
		const res = await apiClient(`/sync/pull?since=${since}`, {
			headers: {
				'Authorization': `Bearer ${authState.token}`
			}
		});

		if (res.ok) {
			const { data } = await res.json();
			const { products, categories, customers } = data;

			if (products && products.length > 0) {
				await db.products.bulkPut(products);
			}
			if (categories && categories.length > 0) {
				await db.categories.bulkPut(categories);
			}
			if (customers && customers.length > 0) {
				await db.customers.bulkPut(customers);
			}
			console.log(`Pulled ${products?.length || 0} products, ${categories?.length || 0} categories, ${customers?.length || 0} customers`);
		}
	} catch (error) {
		console.error('Network error during pull', error);
		throw error;
	}
}
