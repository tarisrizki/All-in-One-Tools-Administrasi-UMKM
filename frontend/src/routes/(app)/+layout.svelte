<script lang="ts">
	import '../layout.css';

	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authState, loadAuthFromStorage } from '$lib/stores/auth.svelte';
	import { syncState, initSyncManager } from '$lib/stores/sync.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/queryClient';
	import { slide } from 'svelte/transition';
	import { ModeWatcher } from 'mode-watcher';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { paletteState } from '$lib/stores/commandPalette.svelte';

	let { children } = $props();

	onMount(() => {
		// Sync manager berjalan di background, tidak memblokir render
		initSyncManager();
		
		import('$lib/stores/appMode.svelte').then(m => m.loadAppModeFromStorage());

		function onKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				paletteState.open = !paletteState.open;
			}
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	// Kasir (POS) sengaja dibuat full-screen tanpa sidebar, supaya layar kasir
	// lega untuk transaksi -- pola yang sama dipakai POS fisik pada umumnya.
	let showSidebar = $derived(!$page.url.pathname.startsWith('/pos'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Beres — All-in-One Tools Administrasi UMKM</title>

</svelte:head>

<CommandPalette bind:open={paletteState.open} />

<Toaster position="top-center" richColors />

{#if !syncState.isOnline}
	<div
		transition:slide={{ duration: 300 }}
		class="bg-destructive/90 backdrop-blur-md text-destructive-foreground text-xs font-bold px-4 py-2.5 text-center sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md border-b border-destructive-foreground/20"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
			><path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
			></path></svg
		>
		Anda sedang offline. Data disimpan sementara dan akan disinkronkan otomatis.
	</div>
{:else if syncState.isSyncing}
	<div
		transition:slide={{ duration: 300 }}
		class="bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 text-center sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md border-b border-blue-400/30"
	>
		<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
		Sinkronisasi data dengan server...
	</div>
{/if}

<ModeWatcher />
<QueryClientProvider client={queryClient}>
	{#if showSidebar}
		<div class="lg:flex lg:min-h-screen lg:items-stretch">
			<aside class="hidden lg:block lg:w-64 lg:shrink-0">
				<div class="lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:w-64 lg:z-40">
					<AppSidebar />
				</div>
			</aside>
			<div class="lg:flex-1 lg:min-w-0 lg:min-h-screen pb-[60px] lg:pb-0">
				{@render children()}
			</div>
		</div>
	{:else}
		{@render children()}
	{/if}

	<!-- Bottom navigation: mobile only, hidden on POS -->
	{#if showSidebar}
		<BottomNav />
	{/if}
</QueryClientProvider>
