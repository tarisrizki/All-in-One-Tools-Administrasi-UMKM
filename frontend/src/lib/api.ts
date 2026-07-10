import { env } from '$env/dynamic/public';
import { authState } from '$lib/stores/auth.svelte';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

const API_URL = env.PUBLIC_API_URL ?? 'http://localhost:8787';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = browser ? localStorage.getItem('umkm_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 
      'Content-Type': 'application/json', 
      ...(token && { Authorization: `Bearer ${token}` }), 
      ...options.headers 
    },
  });
  
  if (res.status === 401) { 
    if (browser) {
      authState.logout(); 
      goto('/auth/login'); 
    }
    throw new Error('Unauthorized'); 
  }
  
  if (!res.ok) {
    let errorMsg = 'Request gagal';
    try {
      const data = await res.json();
      errorMsg = data?.error?.message ?? errorMsg;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMsg);
  }
  
  return res.json();
}
