<script lang="ts">
	import { page } from '$app/stores';
	import { LayoutDashboard, Download, User, CreditCard } from '@lucide/svelte';

	const tabs = [
		{ icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
		{ icon: Download, label: 'Download', href: '/download' },
		{ icon: User, label: 'Profile', href: '/profile' },
		{ icon: CreditCard, label: 'Langganan', href: '/subscription' }
	];
	function isActive(href: string) {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-border flex justify-around h-[60px] px-2 pb-[env(safe-area-inset-bottom)]">
	{#each tabs as tab}
		{@const active = isActive(tab.href)}
		<a href={tab.href} class="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 {active ? 'text-brand' : 'text-ink-faint'}">
			<tab.icon class="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 2} />
			<span class="text-[10.5px] font-{active ? '700' : '500'}">{tab.label}</span>
		</a>
	{/each}
</nav>
