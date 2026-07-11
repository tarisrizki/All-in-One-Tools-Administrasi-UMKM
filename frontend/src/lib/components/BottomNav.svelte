<script lang="ts">
	import { appModeState } from '$lib/stores/appMode.svelte';
	import { page } from '$app/stores';
	import { Home, ShoppingCart, Wallet, BarChart3, Menu } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	const simpleTabs = [
		{ icon: Home, label: 'Beranda', href: '/dashboard' },
		{ icon: ShoppingCart, label: 'Kasir', href: '/pos' },
		{ icon: Wallet, label: 'Kas', href: '/cashbook' },
		{ icon: Menu, label: 'Menu', href: '/settings' },
	];

	const fullTabs = [
		{ icon: Home, label: 'Beranda', href: '/dashboard' },
		{ icon: ShoppingCart, label: 'Kasir', href: '/pos' },
		{ icon: BarChart3, label: 'Laporan', href: '/reports' },
		{ icon: Menu, label: 'Lainnya', href: '/settings' },
	];

	let tabs = $derived(appModeState.mode === 'simple' ? simpleTabs : fullTabs);

	function isActive(href: string): boolean {
		return $page.url.pathname === href || ($page.url.pathname.startsWith(href) && href !== '/dashboard');
	}
</script>

<!-- Mobile Bottom Tab Bar — hanya muncul di < lg, dan bukan di halaman POS -->
{#if appModeState.mode !== undefined}
	<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-border flex items-end justify-around pb-[env(safe-area-inset-bottom)] px-2 h-[60px]">
		{#each tabs as tab}
			{@const active = isActive(tab.href)}
			<a
				href={tab.href}
				class="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 min-h-0 transition-colors {active ? 'text-brand' : 'text-ink-faint hover:text-ink-soft'}"
			>
				<tab.icon
					class="w-[22px] h-[22px]"
					strokeWidth={active ? 2.4 : 2}
				/>
				<span class="font-sans text-[10.5px] font-{active ? '700' : '500'} leading-none">{tab.label}</span>
			</a>
		{/each}
	</nav>
{/if}
