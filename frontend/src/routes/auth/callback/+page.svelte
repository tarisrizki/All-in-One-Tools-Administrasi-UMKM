<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  let err = $state('');
  onMount(async () => {
    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi');
      const url = new URL(location.href);
      if (url.searchParams.get('code')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url.searchParams.get('code')!);
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) goto('/dashboard');
      else err = 'Login gagal, coba masuk Google lagi.';
    } catch (e: any) { err = e?.message || String(e); }
  });
</script>
{#if err}<p class="p-6 text-red-600">{err}</p>{:else}<p class="p-6">Memproses login Google…</p>{/if}
