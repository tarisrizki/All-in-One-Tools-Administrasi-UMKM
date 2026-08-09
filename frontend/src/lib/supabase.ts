import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const supabase = url && anon ? createClient(url, anon, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true } }) : null;

export async function signInWithGoogle(redirectTo = typeof location !== 'undefined' ? `${location.origin}/auth/callback` : '/auth/callback') {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi (cek .env)');
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw error;
}
