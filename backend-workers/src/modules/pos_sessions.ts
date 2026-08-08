import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { ErrorResponseSchema, createSuccessSchema, MessageSuccessSchema } from '../schemas/common';

const openSessionSchema = z.object({
  openingCash: z.number().min(0).openapi({ example: 500000 }),
  notes: z.string().max(500).optional().nullable().openapi({ example: 'Shift pagi' }),
});

const payoutSchema = z.object({
  amount: z.number().min(1).openapi({ example: 50000 }),
  reason: z.string().min(1).max(255).openapi({ example: 'Belanja bahan baku' }),
});

const closeSessionSchema = z.object({
  closingCash: z.number().min(0).openapi({ example: 1200000 }),
  notes: z.string().max(500).optional().nullable().openapi({ example: 'Tutup shift' }),
});

const sessionResponseSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
  openedAt: z.string().openapi({ example: '2024-01-15T08:00:00.000Z' }),
  openingCash: z.string().openapi({ example: '500000' }),
  closedAt: z.string().nullable().optional().openapi({ example: '2024-01-15T20:00:00.000Z' }),
  closingCash: z.string().nullable().optional().openapi({ example: '1200000' }),
  expectedCash: z.string().nullable().optional().openapi({ example: '1180000' }),
  variance: z.string().nullable().optional().openapi({ example: '20000' }),
  status: z.enum(['open', 'closed']).openapi({ example: 'open' }),
  notes: z.string().nullable().optional(),
  createdAt: z.string().openapi({ example: '2024-01-15T08:00:00.000Z' }),
  updatedAt: z.string().openapi({ example: '2024-01-15T08:00:00.000Z' }),
}).passthrough();

const payoutResponseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  amount: z.string(),
  reason: z.string(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
}).passthrough();

const listRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'get',
  path: '/',
  description: 'List POS sessions',
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(z.array(sessionResponseSchema)) } }, description: 'Daftar session' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const openRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'post',
  path: '/open',
  request: { body: { content: { 'application/json': { schema: openSessionSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: createSuccessSchema(sessionResponseSchema) } }, description: 'Session dibuka' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const closeRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'post',
  path: '/:id/close',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: closeSessionSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(sessionResponseSchema) } }, description: 'Session ditutup' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Session tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const payoutRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'post',
  path: '/:id/payout',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: payoutSchema } } },
  },
  responses: {
    201: { content: { 'application/json': { schema: createSuccessSchema(payoutResponseSchema) } }, description: 'Payout dicatat' },
    400: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Input tidak valid' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Session tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

const detailRoute = createRoute({
  tags: ['POS Sessions'],
  method: 'get',
  path: '/:id',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { content: { 'application/json': { schema: createSuccessSchema(sessionResponseSchema) } }, description: 'Detail session' },
    404: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Session tidak ditemukan' },
    500: { content: { 'application/json': { schema: ErrorResponseSchema } }, description: 'Server error' },
  },
});

export { posSessionsRoute };