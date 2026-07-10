import { createClient } from '@supabase/supabase-js';

export const getSupabase = (env: Record<string, string>) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
};
