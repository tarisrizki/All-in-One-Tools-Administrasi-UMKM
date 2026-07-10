import { test, expect, vi } from 'vitest';
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

// 2. Mock Supabase client
const mockSingle = vi.fn();
const mockEqBusinessId = vi.fn(() => ({ single: mockSingle }));
const mockEqId = vi.fn(() => ({ eq: mockEqBusinessId }));
const mockSelect = vi.fn(() => ({ eq: mockEqId }));

vi.mock('../src/utils/supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === 'sales') {
        return { select: mockSelect };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) };
    })
  }))
}));

test('IDOR Protection: GET /sales/:id must scope to businessId from JWT', async () => {
  // Simulate the DB returning null because the business_id doesn't match the sale's owner
  mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

  // Try to access a sale belonging to Business B
  const req = new Request('http://localhost/sales/sale-B/document', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer fake' }
  });

  const res = await worker.fetch(req, { JWT_SECRET: 'test' });
  const json = await res.json();

  // Assert API returns 404 Not Found
  expect(res.status).toBe(404);
  expect(json.success).toBe(false);
  
  // VITAL: Assert that the database query included .eq('business_id', 'biz-A')
  // This proves that IDOR scoping is active and users cannot fetch other businesses' data
  expect(mockEqBusinessId).toHaveBeenCalledWith('business_id', 'biz-A');
});
