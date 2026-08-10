// ponytail: Svelte landing only — sidebar 4 link (dashboard/download/profile/subscription) + lite state
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { authMiddleware } from '../middleware/auth';

const meRoute = createRoute({
  tags: ['Subscriptions'],
  method: 'get',
  path: '/me',
  responses: {
    200: { description: 'ok', content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.any() }) } } },
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const subscriptionsRoute = new OpenAPIHono<{ Bindings: any; Variables: Variables }>();
subscriptionsRoute.use('*', authMiddleware);
subscriptionsRoute.openapi(meRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const { data } = await supabase.from('subscriptions').select('plan,status,current_period_end').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const row: any = data || null;
  const active = !!row && row.status === 'active' && (!row.current_period_end || new Date(row.current_period_end) > new Date());
  return c.json({ success: true, data: row ? { active, plan: row.plan, expiresAt: row.current_period_end } : { active: false, plan: null, expiresAt: null } }, 200);
});
