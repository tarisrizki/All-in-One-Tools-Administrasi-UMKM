import { test, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index';

// 1. Mock the auth middleware so we can inject a test businessId
vi.mock('../src/middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', 'test-user');
    c.set('businessId', 'biz-A'); // User belongs to Business A
    c.set('roleId', 'test-role');
    await next();
  },
  requirePermission: () => async (c: any, next: any) => {
    // Bypass permission checking to focus purely on IDOR scoping
    await next();
  }
}));

// 2. Generic Supabase Mock Builder
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockInsert = vi.fn();

const createChain = () => {
  const chain: any = {
    select: mockSelect,
    eq: mockEq,
    in: mockIn,
    insert: mockInsert,
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: "Mocked Not Found" } }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis()
  };
  
  // Make all methods return the chain itself to support chaining
  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockIn.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  
  // Make the chain thenable so await works
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
    })
  }))
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('IDOR Protection: GET /sales/:id must scope to businessId from JWT', async () => {
  const req = new Request('http://localhost/sales/11111111-1111-4111-a111-111111111111/document', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer fake' }
  });

  const res = await worker.fetch(req, { JWT_SECRET: 'test' });
  const json = await res.json();

  expect(res.status).toBe(404);
  
  // Verify that the query included .eq('business_id', 'biz-A')
  expect(mockEq).toHaveBeenCalledWith('business_id', 'biz-A');
  expect(mockEq).toHaveBeenCalledWith('id', '11111111-1111-4111-a111-111111111111');
});

test('IDOR Protection: GET /sales (list) must scope to businessId from JWT', async () => {
  const req = new Request('http://localhost/sales?page=1', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer fake' }
  });

  await worker.fetch(req, { JWT_SECRET: 'test' });

  // Verify that the list query applied the business_id filter
  expect(mockEq).toHaveBeenCalledWith('business_id', 'biz-A');
});

test('IDOR Protection: POST /sales must enforce business ownership of products and warehouse', async () => {
  const req = new Request('http://localhost/sales', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: '00000000-0000-4000-8000-000000000001', qty: 1, price: 10000, discount: 0 }],
      payments: [{ method: 'cash', amount: 10000 }]
    })
  });

  // Since we mocked `single` to return null, the sale creation will fail at warehouse lookup
  // But we just want to verify the scoping was attempted!
  await worker.fetch(req, { JWT_SECRET: 'test' });

  // Verify warehouse lookup is scoped
  expect(mockEq).toHaveBeenCalledWith('business_id', 'biz-A');
  expect(mockEq).toHaveBeenCalledWith('is_default', true);
});

test('IDOR Protection: POST /purchases must enforce business ownership of warehouse', async () => {
  const req = new Request('http://localhost/purchases', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: '00000000-0000-4000-8000-000000000002', // Malicious input trying to use other business's warehouse
      supplier_id: '00000000-0000-4000-8000-000000000003',
      items: [{ product_id: '00000000-0000-4000-8000-000000000004', qty: 10, cost_price: 5000 }],
    })
  });

  await worker.fetch(req, { JWT_SECRET: 'test' });

  // Verify warehouse lookup is scoped
  expect(mockEq).toHaveBeenCalledWith('business_id', 'biz-A');
});
