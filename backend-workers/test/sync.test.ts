import { test, expect, vi, beforeEach, describe } from 'vitest';
import worker from '../src/index';

// Mock the auth middleware
vi.mock('../src/middleware/auth', () => ({
	authMiddleware: async (c: any, next: any) => {
		c.set('userId', 'test-user');
		c.set('businessId', 'biz-A');
		c.set('roleId', 'test-role');
		await next();
	},
	requirePermission: () => async (c: any, next: any) => {
		await next();
	}
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockInsert = vi.fn();
const mockSingle = vi.fn();
const mockRPC = vi.fn();

const createChain = () => {
	const chain: any = {
		select: mockSelect,
		eq: mockEq,
		in: mockIn,
		insert: mockInsert,
		single: mockSingle,
		limit: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		gt: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
	};
	mockSelect.mockReturnValue(chain);
	mockEq.mockReturnValue(chain);
	mockIn.mockReturnValue(chain);
	mockInsert.mockReturnValue(chain);
	chain.then = (resolve: any) => resolve({ data: [], error: null, count: 0 });
	return chain;
};

const tableMocks: Record<string, any> = {};

vi.mock('../src/utils/supabase', () => ({
	getSupabase: vi.fn(() => ({
		from: vi.fn((table) => {
			if (!tableMocks[table]) {
				tableMocks[table] = createChain();
			}
			return tableMocks[table];
		}),
		rpc: mockRPC
	}))
}));

beforeEach(() => {
	vi.clearAllMocks();
	Object.keys(tableMocks).forEach(k => delete tableMocks[k]);
});

describe('Sync Push - POST /sync/push', () => {
	const validTransaction = {
		client_transaction_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		items: [{ productId: '11111111-1111-4111-8111-111111111111', qty: 2, price: 50000, discount: 0 }],
		payments: [{ method: 'cash', amount: 100000 }],
		customerName: 'Test Customer',
		customerPhone: '08123456789',
		notes: 'Test transaction'
	};

	test('returns per-item results array with index, clientTransactionId, success, error', async () => {
		// Mock warehouse lookup
		mockSingle.mockResolvedValueOnce({ data: { id: 'warehouse-1' }, error: null });
		// Mock product validation — inject chain with correct data
		const productChain: any = { eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() };
		productChain.then = (resolve: any) => resolve({ data: [{ id: validTransaction.items[0].productId }], error: null });
		// @ts-ignore
		tableMocks['products'] = { select: vi.fn(() => productChain) };
		// Mock process_sale RPC success
		mockRPC.mockResolvedValueOnce({ data: { success: true }, error: null });

		const req = new Request('http://localhost/sync/push', {
			method: 'POST',
			headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
			body: JSON.stringify({ transactions: [validTransaction] })
		});

		const res = await worker.fetch(req, { JWT_SECRET: 'test' });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.data.results).toBeDefined();
		expect(Array.isArray(json.data.results)).toBe(true);
		expect(json.data.results.length).toBe(1);

		const result = json.data.results[0];
		expect(result.index).toBe(0);
		expect(result.clientTransactionId).toBe(validTransaction.client_transaction_id);
		expect(result.success).toBe(true);
		expect(result.error).toBeNull();
	});

	test('handles multiple transactions with mixed success/failure', async () => {
		const tx1 = { ...validTransaction, client_transaction_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
		const tx2 = { ...validTransaction, client_transaction_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' };
		const tx3 = { ...validTransaction, client_transaction_id: '44444444-4444-4ddd-8ddd-444444444444' };

		// Mock warehouse lookup (called once)
		mockSingle.mockResolvedValueOnce({ data: { id: 'warehouse-1' }, error: null });
		// Mock product validation — deduped (all 3 tx share same productId, Set size = 1)
		const productChainAll: any = { eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() };
		productChainAll.then = (resolve: any) => resolve({ data: [{ id: validTransaction.items[0].productId }], error: null });
		// @ts-ignore
		tableMocks['products'] = { select: vi.fn(() => productChainAll) };
		// Mock sales chain for count queries + duplicate check (maybeSingle)
		const salesChain: any = { eq: vi.fn().mockReturnThis() };
		salesChain.then = (resolve: any) => resolve({ data: [], error: null, count: 0 });
		salesChain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'existing-sale' }, error: null });
		salesChain.single = vi.fn().mockResolvedValue({ data: { id: 'existing-sale' }, error: null });
		// @ts-ignore
		tableMocks['sales'] = { select: vi.fn(() => salesChain) };
		// Mock process_sale RPC: first succeeds, second fails with unique violation (duplicate), third fails with other error
		mockRPC
			.mockResolvedValueOnce({ data: { success: true }, error: null }) // tx1 success
			.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }) // tx2 duplicate
			.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Insufficient stock' } }); // tx3 other error

		const req = new Request('http://localhost/sync/push', {
			method: 'POST',
			headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
			body: JSON.stringify({ transactions: [tx1, tx2, tx3] })
		});

		const res = await worker.fetch(req, { JWT_SECRET: 'test' });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data.results.length).toBe(3);

		expect(json.data.results[0].success).toBe(true);
		expect(json.data.results[0].error).toBeNull();

		expect(json.data.results[1].success).toBe(true); // duplicate treated as success (idempotent)
		expect(json.data.results[1].error).toBeNull();

		expect(json.data.results[2].success).toBe(false);
		expect(json.data.results[2].error).toContain('Insufficient stock');
	});

	test('enforces batch size limit of 100 transactions', async () => {
		const manyTransactions = Array.from({ length: 101 }, (_, i) => ({
			...validTransaction,
			client_transaction_id: `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, '0')}`
		}));

		// Mock warehouse lookup
		mockSingle.mockResolvedValueOnce({ data: { id: 'warehouse-1' }, error: null });
		// Mock product validation
		mockSelect.mockResolvedValueOnce({ data: manyTransactions.map(t => ({ id: t.items[0].productId })), error: null });
		// Mock RPC for all (should only process 100 due to schema validation)
		mockRPC.mockResolvedValue({ data: { success: true }, error: null });

		const req = new Request('http://localhost/sync/push', {
			method: 'POST',
			headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
			body: JSON.stringify({ transactions: manyTransactions })
		});

		const res = await worker.fetch(req, { JWT_SECRET: 'test' });
		const json = await res.json();

		// Zod schema enforces max 100
		expect(res.status).toBe(400);
	});

	test('validates required fields', async () => {
		const req = new Request('http://localhost/sync/push', {
			method: 'POST',
			headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
			body: JSON.stringify({ transactions: [] })
		});

		const res = await worker.fetch(req, { JWT_SECRET: 'test' });
		expect(res.status).toBe(400);
	});

	test('validates transaction structure', async () => {
		const invalidTx = {
			client_transaction_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
			items: [], // empty items - should fail min(1)
			payments: [{ method: 'cash', amount: 100 }]
		};

		const req = new Request('http://localhost/sync/push', {
			method: 'POST',
			headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
			body: JSON.stringify({ transactions: [invalidTx] })
		});

		const res = await worker.fetch(req, { JWT_SECRET: 'test' });
		expect(res.status).toBe(400);
	});
});

describe('Sync Pull - GET /sync/pull', () => {
	function makePullChain(data: any[]) {
		const chain: any = {
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockReturnThis(),
			gt: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
		};
		chain.then = (resolve: any) => resolve({ data, error: null });
		return chain;
	}

	test('returns paginated data with cursor', async () => {
		const pChain = makePullChain([]);
		const cChain = makePullChain([]);
		const custChain = makePullChain([]);
		// @ts-ignore
		tableMocks['products'] = { select: vi.fn(() => pChain) };
		// @ts-ignore
		tableMocks['categories'] = { select: vi.fn(() => cChain) };
		// @ts-ignore
		tableMocks['customers'] = { select: vi.fn(() => custChain) };

		const req = new Request('http://localhost/sync/pull?limit=50', {
			method: 'GET',
			headers: { 'Authorization': 'Bearer fake' }
		});

		const res = await worker.fetch(req, { JWT_SECRET: 'test' });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
		expect(json.data.products).toBeDefined();
		expect(json.data.categories).toBeDefined();
		expect(json.data.customers).toBeDefined();
		expect(json.data.nextCursor).toBeDefined();
		expect(json.data.hasMore).toBeDefined();
	});

	test('respects since parameter', async () => {
		const pChain = makePullChain([]);
		const cChain = makePullChain([]);
		const custChain = makePullChain([]);
		// @ts-ignore
		tableMocks['products'] = { select: vi.fn(() => pChain) };
		// @ts-ignore
		tableMocks['categories'] = { select: vi.fn(() => cChain) };
		// @ts-ignore
		tableMocks['customers'] = { select: vi.fn(() => custChain) };

		const since = '2024-01-01T00:00:00.000Z';
		const req = new Request(`http://localhost/sync/pull?since=${encodeURIComponent(since)}&limit=50`, {
			method: 'GET',
			headers: { 'Authorization': 'Bearer fake' }
		});

		const res = await worker.fetch(req, { JWT_SECRET: 'test' });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.success).toBe(true);
	});
});
