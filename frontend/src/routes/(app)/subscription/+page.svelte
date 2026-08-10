<script lang="ts">import favicon from '$lib/assets/favicon.svg'; let status=$state<{active:boolean|null, plan:string|null, expiresAt:string|null}>({active:null, plan:null, expiresAt:null}); import { onMount } from 'svelte'; import { apiClient } from '$lib/utils/api'; import { authState } from '$lib/stores/auth.svelte'; onMount(async()=>{try{const r=await apiClient('/subscriptions/me',{headers:{Authorization:`Bearer ${authState.token}`}}); if(r.success) status=r.data; }catch{}});</script>
<svelte:head><link rel="icon" href={favicon} /><title>Langganan — Beres</title></svelte:head>
<main class="px-6 py-8 max-w-2xl mx-auto">
	<h1 class="font-grotesk text-2xl font-bold text-ink mb-4">Langganan</h1>
	<div class="rounded-xl border border-border bg-paper p-6">
		<div class="text-sm font-semibold {status.active ? 'text-green-600' : status.active===false ? 'text-red-600' : 'text-ink-soft'}">{status.active===null ? 'Memuat…' : status.active ? 'Aktif — '+(status.plan??'—') : 'Tidak aktif'}</div>
		{#if status.expiresAt}<div class="text-xs text-ink-soft mt-1">Berakhir: {status.expiresAt}</div>{/if}
		<div class="mt-4 flex gap-2">
			<a href="/subscription" class="rounded-xl bg-cta px-5 py-2.5 text-sm font-bold text-white">Langganan / Perpanjang</a>
			<span class="text-xs text-ink-soft self-center">ponytail: sambungkan ke Midtrans/Xendit checkout nanti.</span>
		</div>
	</div>
</main>
