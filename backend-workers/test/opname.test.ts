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
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRpc = vi.fn();

const createChain = () => {
  const chain: any = {
    select: mockSelect,
    eq: mockEq,
    in: mockIn,
    insert: mockInsert,
    single: mockSingle,
    update: mockUpdate,
    delete: mockDelete,
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  };

  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockIn.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockDelete.mockReturnValue(chain);

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
    rpc: mockRpc
  }))
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(tableMocks).forEach(k => delete tableMocks[k]);
  (mockRpc as any).mockReset?.();
});

describe('Stock Opname Flow', () => {
  const mockOpnameId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const mockProductId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const mockWarehouseId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  test('CREATE: POST /stock-opnames creates draft opname', async () => {
    const mockOpname = {
      id: mockOpnameId,
      business_id: 'biz-A',
      warehouse_id: mockWarehouseId,
      status: 'draft',
      reason: null,
      created_by: 'test-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockSingle.mockResolvedValueOnce({ data: mockOpname, error: null });

    const req = new Request('http://localhost/stock-opnames', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: mockWarehouseId,
        reason: 'Bulanan'
      })
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(mockOpnameId);
    expect(json.data.status).toBe('draft');
    expect(mockInsert).toHaveBeenCalled();
  });

  test('ADD ITEMS: POST /stock-opnames/:id/items records counted quantities', async () => {
    const mockOpname = {
      warehouse_id: mockWarehouseId
    };
    mockSingle.mockResolvedValueOnce({ data: mockOpname, error: null });
    mockInsert.mockResolvedValueOnce({ data: [], error: null });

    const req = new Request(`http://localhost/stock-opnames/${mockOpnameId}/items`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { product_id: mockProductId, system_qty: 100, counted_qty: 95 },
        { product_id: '44444444-4444-4ddd-8ddd-444444444444', system_qty: 50, counted_qty: 52 }
      ])
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Items counted');
    expect(mockInsert).toHaveBeenCalled();
  });

  test('APPROVE: POST /stock-opnames/:id/approve with reason creates adjustment movements', async () => {
    const mockRpcResult = {
      id: mockOpnameId,
      status: 'approved',
      message: 'Stock opname disetujui dan stok disesuaikan'
    };
    mockRpc.mockResolvedValueOnce({ data: mockRpcResult, error: null });

    const req = new Request(`http://localhost/stock-opnames/${mockOpnameId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Sesuai fisik',
        approved_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      })
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('approved');
    expect(mockRpc).toHaveBeenCalledWith('approve_stock_opname', expect.objectContaining({
      p_opname_id: mockOpnameId,
      p_business_id: 'biz-A',
      p_approved_by: mockOpnameId,
      p_reason: 'Sesuai fisik'
    }));
  });

  test('APPROVE: Rejects when reason is missing', async () => {
    mockRpc.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Alasan persetujuan wajib diisi' } 
    });

    const req = new Request(`http://localhost/stock-opnames/${mockOpnameId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: '',
        approved_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      })
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.message).toContain('wajib');
  });

  test('CANCEL: POST /stock-opnames/:id/cancel writes reversal stock_movements', async () => {
    const mockRpcResult = {
      id: mockOpnameId,
      status: 'cancelled',
      message: 'Stock opname dibatalkan, reversal entries dicatat untuk audit'
    };
    mockRpc.mockResolvedValueOnce({ data: mockRpcResult, error: null });

    const req = new Request(`http://localhost/stock-opnames/${mockOpnameId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Salah hitung',
        cancelled_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      })
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('cancelled');
    expect(mockRpc).toHaveBeenCalledWith('cancel_stock_opname', expect.objectContaining({
      p_opname_id: mockOpnameId,
      p_business_id: 'biz-A',
      p_cancelled_by: mockOpnameId,
      p_reason: 'Salah hitung'
    }));
  });

  test('CANCEL: Rejects when reason is missing', async () => {
    mockRpc.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Alasan pembatalan wajib diisi' } 
    });

    const req = new Request(`http://localhost/stock-opnames/${mockOpnameId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: '',
        cancelled_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      })
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.message).toContain('wajib');
  });

  test('REPORT: GET /stock-opnames/report returns shrinkage stats', async () => {
    const mockReport = {
      total_variance: -5,
      total_gain: 2,
      total_shrinkage: 7,
      opname_count: 3,
      item_count: 10
    };
    mockRpc.mockResolvedValueOnce({ data: mockReport, error: null });

    const req = new Request('http://localhost/stock-opnames/report?startDate=2026-01-01&endDate=2026-12-31', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer fake' }
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.total_variance).toBe(-5);
    expect(json.data.total_gain).toBe(2);
    expect(json.data.total_shrinkage).toBe(7);
    expect(json.data.opname_count).toBe(3);
    expect(json.data.item_count).toBe(10);
    expect(mockRpc).toHaveBeenCalledWith('get_stock_opname_report', expect.objectContaining({
      p_business_id: 'biz-A',
      p_start_date: '2026-01-01',
      p_end_date: '2026-12-31'
    }));
  });

  test('LIST: GET /stock-opnames filters by status', async () => {
    const mockOpnames = [
      { id: mockOpnameId, business_id: 'biz-A', warehouse_id: mockWarehouseId, status: 'draft', reason: null, created_by: 'test-user', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), warehouses: { name: 'Gudang Utama' } }
    ];
    // Override the stock_opnames chain's then for this test
    tableMocks['stock_opnames'] = null;
    const freshChain = createChain();
    freshChain.then = (resolve: any) => resolve({ data: mockOpnames, error: null });
    tableMocks['stock_opnames'] = freshChain;

    const req = new Request('http://localhost/stock-opnames?status=draft', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer fake' }
    });

    const res = await worker.fetch(req, { JWT_SECRET: 'test' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].status).toBe('draft');
    expect(mockEq).toHaveBeenCalledWith('business_id', 'biz-A');
    expect(mockEq).toHaveBeenCalledWith('status', 'draft');
  });
});