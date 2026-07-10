import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';

export const healthRoute = new Hono<{ Bindings: any }>();

healthRoute.get('/', async (c) => {
  const supabase = getSupabase(c.env);
  try {
    // Lightweight query to ensure Supabase DB connection registers activity (preventing pause)
    const { error } = await supabase.from('businesses').select('id').limit(1);
    const dbStatus = error ? 'down' : 'up';
    return c.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString() });
  } catch (e) {
    return c.json({ status: 'ok', db: 'error', timestamp: new Date().toISOString() });
  }
});
