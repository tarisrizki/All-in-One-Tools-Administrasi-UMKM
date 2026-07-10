import { createClient } from '@supabase/supabase-js';

export function getSupabase(env: any) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Service Role Key in environment variables');
  }

  // Gunakan service_role key untuk by-pass RLS di sisi backend,
  // TAPI pastikan seluruh query menyertakan filter .eq('business_id', businessId)
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}
