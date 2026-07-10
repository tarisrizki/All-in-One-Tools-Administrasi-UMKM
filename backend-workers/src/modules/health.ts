import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';

export const healthRoute = new OpenAPIHono<{ Bindings: any }>();

const healthResponseSchema = z.object({
  status: z.string().openapi({ example: 'ok' }),
  db: z.string().openapi({ example: 'up' }),
  timestamp: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
});

const route = createRoute({
  method: 'get',
  path: '/',
  description: 'Mengecek status sistem dan koneksi database',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
      description: 'System health status',
    },
  },
});

healthRoute.openapi(route, async (c) => {
  const supabase = getSupabase(c.env);
  try {
    // Lightweight query to ensure Supabase DB connection registers activity (preventing pause)
    const { error } = await supabase.from('businesses').select('id').limit(1);
    const dbStatus = error ? 'down' : 'up';
    return c.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString() }, 200);
  } catch (e) {
    return c.json({ status: 'ok', db: 'error', timestamp: new Date().toISOString() }, 200);
  }
});
