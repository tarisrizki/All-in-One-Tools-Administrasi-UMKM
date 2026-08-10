<script lang="ts">
	import { page } from '$app/stores';
	import { logout } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { LayoutDashboard, Download, User, CreditCard, LogOut, X } from '@lucide/svelte';

	let { onNavigate }: { onNavigate?: () => void } = $props();

	const items = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/download', label: 'Download', icon: Download },
		{ href: '/profile', label: 'Profile', icon: User },
		{ href: '/subscription', label: 'Langganan', icon: CreditCard }
	];

	function isActive(href: string) {
		const p = $page.url.pathname;
		return p === href || p.startsWith(href + '/');
	}
	function handleLogout() {
		logout();
		goto('/auth/login');
	}
</script>

<div class="flex h-full flex-col bg-paper-dark text-white/80">
	<div class="flex items-center justify-between px-5 pt-6 pb-5">
		<a href="/dashboard" class="flex items-center gap-2.5" onclick={onNavigate}>
			<div class="w-8 h-8 rounded-lg bg-cta text-white flex items-center justify-center font-bold font-grotesk text-sm -rotate-6">B</div>
			<span class="font-grotesk font-bold text-lg text-white">Beres</span>
		</a>
		{#if onNavigate}
			<button type="button" onclick={onNavigate} class="lg:hidden text-white/50 hover:text-white p-1" aria-label="Tutup menu"><X class="w-5 h-5" /></button>
		{/if}
	</div>
	<nav class="flex-1 overflow-y-auto px-3 pb-4">
		{#each items as item}
			{@const active = isActive(item.href)}
			<a href={item.href} onclick={onNavigate} class="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-[13.5px] font-semibold {active ? 'bg-cta/15 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}">
				<item.icon class="w-[18px] h-[18px] {active ? 'text-cta' : 'text-white/40'}" />
				{item.label}
			</a>
		{/each}
	</nav>
	<div class="px-3 pb-4 pt-2 border-t border-white/10">
		<button type="button" onclick={handleLogout} class="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-[13px] font-semibold text-white/50 hover:bg-white/5 hover:text-white">
			<LogOut class="w-[18px] h-[18px]" /> Keluar
		</button>
	</div>
</div>
