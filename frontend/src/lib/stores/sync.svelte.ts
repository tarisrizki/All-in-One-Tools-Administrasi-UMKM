import { apiClient } from '$lib/utils/api';
import { db } from '../db.js';
import { authState } from './auth.svelte.js';
import { toast } from 'svelte-sonner';

export const syncState = $state({
	isOnline: true, // We assume online by default, updated on mount
	isSyncing: false,
	lastSyncTime: null as Date | null,
	syncStats: { pending: 0, failed: 0, pushed: 0 } as { pending: number; failed: number; pushed: number },
});

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function initSyncManager() {
	if (typeof window === 'undefined') return;

	syncState.isOnline = navigator.onLine;

	const onOnline = () => {
		syncState.isOnline = true;
		toast.success('Koneksi terhubung kembali. Memulai sinkronisasi...');
		triggerSync();
	};
	const onOffline = () => {
		syncState.isOnline = false;
		toast.warning('Koneksi terputus. Beralih ke mode offline.');
	};

	window.addEventListener('online', onOnline);
	window.addEventListener('offline', onOffline);

	if (syncInterval) clearInterval(syncInterval);
	syncInterval = setInterval(() => {
		if (syncState.isOnline && authState.isAuthenticated) {
			triggerSync();
		}
	}, 5 * 60 * 1000);

	return () => {
		window.removeEventListener('online', onOnline);
		window.removeEventListener('offline', onOffline);
		if (syncInterval) {
			clearInterval(syncInterval);
			syncInterval = null;
		}
	};
}

export async function triggerSync() {
	if (!syncState.isOnline || syncState.isSyncing || !authState.isAuthenticated) return;

	syncState.isSyncing = true;
	try {
		const results = await pushPendingTransactions();
		updateSyncStats(results);
		await pullLatestData();
		syncState.lastSyncTime = new Date();
	} catch (error) {
		console.error('Sync failed:', error);
	} finally {
		syncState.isSyncing = false;
	}
}

async function pushPendingTransactions() {
	// Sort by next_retry_at ascending (earliest first), pending first
	const pending = await db.pending_transactions
		.where('status')
		.anyOf(['pending', 'failed'])
		.toArray();
	
	pending.sort((a, b) => (a.next_retry_at || 0) - (b.next_retry_at || 0));
	
	// Enforce batch size ≤ 100
	const batch = pending.slice(0, 100);
	if (batch.length === 0) return [];

	const results: Array<{ index: number; clientTransactionId: string; success: boolean; error: string | null }> = [];

	for (let idx = 0; idx < batch.length; idx++) {
		const tx = batch[idx];
		let success = false;
		let error: string | null = null;

		const maxRetries = 3;
		const backoff = Math.pow(2, tx.retry_count || 0) * 1000;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const res = await apiClient(`/sync/push`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${authState.token}`
					},
					body: JSON.stringify({ transactions: [tx] })
				});

				if (res.success) {
					success = true;
					error = null;
					break;
				} else {
					const errData = res.error || {};
					error = errData.message || `Gagal push transaction ${idx}`;
					break;
				}
			} catch (err: any) {
				error = err?.message || `Network error during push attempt ${attempt + 1}`;
			}

			if (attempt < maxRetries) {
				await new Promise(r => setTimeout(r, backoff));
			}
		}

		if (success) {
						await db.pending_transactions.update(tx.client_transaction_id, {
							status: 'pushed' as const,
							retry_count: tx.retry_count || 0,
							last_error: null,
							next_retry_at: null,
							updated_at: new Date()
						});
					} else {
						await db.pending_transactions.update(tx.client_transaction_id, {
							status: 'failed' as const,
							retry_count: (tx.retry_count || 0) + 1,
							last_error: error,
							next_retry_at: new Date(Date.now() + backoff).toISOString(),
							updated_at: new Date()
						});
					}

		results.push({ index: idx, clientTransactionId: tx.client_transaction_id, success, error });
	}

	return results;
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

	let cursor: string | null = null;
	const limit = 200;

	try {
		while (true) {
			const params = new URLSearchParams({ since, limit: String(limit) });
			if (cursor) params.set('cursor', cursor);
			
			const res = await apiClient(`/sync/pull?${params.toString()}`, {
				headers: {
					'Authorization': `Bearer ${authState.token}`
				}
			});

			if (!res.success) break;

			const { products, categories, customers, nextCursor, hasMore } = res.data;

			if (products && products.length > 0) {
				await db.products.bulkPut(products);
			}
			if (categories && categories.length > 0) {
				await db.categories.bulkPut(categories);
			}
			if (customers && customers.length > 0) {
				await db.customers.bulkPut(customers);
			}

			if (!hasMore || !nextCursor) break;
			cursor = nextCursor;
		}
	} catch (error) {
		console.error('Network error during pull', error);
		throw error;
	}
}

function updateSyncStats(results: Array<{ index: number; clientTransactionId: string; success: boolean; error: string | null }>) {
	const pending = syncState.syncStats.pending;
	const failed = syncState.syncStats.failed;

	syncState.syncStats = {
		pending: results.filter(r => !r.success).length,
		failed: results.filter(r => !r.success && r.error).length,
		pushed: results.filter(r => r.success).length,
	};
}

// Expose sync stats for UI
export function getSyncStats() {
	return syncState.syncStats;
}

// Detailed sync stats for UI badge (includes last sync time, counts by status)
export function getDetailedSyncStats() {
	return {
		...syncState.syncStats,
		lastSyncTime: syncState.lastSyncTime,
		isSyncing: syncState.isSyncing,
		isOnline: syncState.isOnline
	};
}

// Helper: manual retry for all failed transactions
export async function retryAllFailed() {
	const failedTxs = await db.pending_transactions
		.where('status')
		.equals('failed')
		.toArray();

	if (failedTxs.length === 0) return [];

	for (const tx of failedTxs) {
		await db.pending_transactions.update(tx.client_transaction_id, {
			retry_count: 0,
			last_error: null,
			next_retry_at: null,
			status: 'pending' as const,
			updated_at: new Date()
		});
	}

	return pushPendingTransactions();
}

// Helper: manual retry for a single transaction
export async function retryTransaction(clientTransactionId: string) {
	const tx = await db.pending_transactions.get(clientTransactionId);
	if (!tx) return { success: false, error: 'Transaction not found' };

	// Reset retry count and error
	await db.pending_transactions.update(tx.client_transaction_id, {
		retry_count: 0,
		last_error: null,
		next_retry_at: null,
		status: 'pending' as const,
		updated_at: new Date()
	});

	// Re-push the transaction
	return pushPendingTransactions();
}