<script lang="ts">
	import './layout.css';
	import './shadcn.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authState, loadAuthFromStorage } from '$lib/stores/auth.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
	let initialized = $state(false);
	let isOffline = $state(false);

	onMount(() => {
		loadAuthFromStorage();

		const isAuthRoute = $page.url.pathname.startsWith('/auth');

		if (!authState.isAuthenticated && !isAuthRoute) {
			goto('/auth/login');
		} else if (authState.isAuthenticated && isAuthRoute) {
			goto('/');
		}

		initialized = true;

		// Offline detection
		isOffline = !navigator.onLine;
		window.addEventListener('offline', () => (isOffline = true));
		window.addEventListener('online', () => (isOffline = false));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>UMKM Tools — Kasir, Stok & Keuangan dalam Satu Aplikasi</title>
</svelte:head>

<Toaster position="top-center" richColors />

{#if isOffline}
	<div
		class="bg-destructive text-destructive-foreground text-xs font-bold px-4 py-2 text-center sticky top-0 z-50 flex items-center justify-center gap-2 shadow-sm"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
			><path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
			></path></svg
		>
		Anda sedang offline. Data akan disinkronkan saat terhubung.
	</div>
{/if}

{#if initialized}
	{@render children()}
{/if}
