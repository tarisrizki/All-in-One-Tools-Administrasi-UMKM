<script lang="ts">
	import { authState } from '$lib/stores/auth.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/utils/api';
	let stats=<{salesToday:number, revenueToday:number} | null>(null);
	let sub=<{active:boolean|null}>({active:null});
	onMount(async()=>{try{const a=await apiClient('/reports/dashboard',{headers:{Authorization:`Bearer ${authState.token}`}}); if(a.success) stats={salesToday:a.data?.salesToday??0, revenueToday:a.data?.revenueToday??0};}catch{} try{const b=await apiClient('/subscriptions/me',{headers:{Authorization:`Bearer ${authState.token}`}}); if(b.success) sub={active:!!b.data?.active};}catch{ sub={active:false};}});
</script>
<svelte:head><link rel="icon" href={favicon} /><title>Dashboard — Beres</title></svelte:head>
<main class="px-6 py-8 max-w-3xl mx-auto">
	<h1 class="font-grotesk text-2xl font-bold text-ink mb-2">Dashboard</h1>
	<p class="text-sm text-ink-soft mb-6">Ringkasan umum — detail lengkap ada di aplikasi desktop.</p>
	<div class="grid grid-cols-2 gap-4 mb-6">
		<div class="rounded-xl border border-border bg-paper p-4"><div class="text-xs text-ink-soft">Penjualan hari ini</div><div class="text-xl font-bold text-ink">{stats?.salesToday ?? "—"}</div></div>
		<div class="rounded-xl border border-border bg-paper p-4"><div class="text-xs text-ink-soft">Pendapatan hari ini</div><div class="text-xl font-bold text-ink">{stats ? "Rp "+(stats.revenueToday).toLocaleString("id-ID") : "—"}</div></div>
	</div>
	<div class="rounded-xl border border-border bg-paper p-4 flex items-center justify-between">
		<div><div class="text-sm font-semibold text-ink">Langganan</div><div class="text-xs {sub.active ? "text-green-600" : sub.active===false ? "text-red-600" : "text-ink-soft"}">{sub.active===null ? "Memuat…" : sub.active ? "Aktif" : "Tidak aktif"}</div></div>
		<a href="/subscription" class="rounded-xl bg-cta px-4 py-2 text-sm font-bold text-white">Kelola</a>
	</div>
	<p class="text-xs text-ink-soft mt-4">ponytail: tambah widget laporan/penjualan lebih lengkap nanti; data dari /reports/dashboard & /subscriptions/me.</p>
</main>
