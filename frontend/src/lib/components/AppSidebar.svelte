<script lang="ts">
	import { page } from '$app/stores';
	import { logout } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { openPalette } from '$lib/stores/commandPalette.svelte';
	import { appModeState, setAppMode } from '$lib/stores/appMode.svelte';
	import {
		LayoutDashboard,
		ShoppingCart,
		Receipt,
		Package,
		ClipboardList,
		Truck,
		Wallet,
		Handshake,
		LineChart,
		Calculator,
		Users,
		UserCog,
		Sparkles,
		Settings,
		LogOut,
		Search,
		X
	} from '@lucide/svelte';

	let { onNavigate }: { onNavigate?: () => void } = $props();

	type NavItem = { href: string; label: string; icon: any; badge?: string; simpleVisible?: boolean };
	type NavGroup = { label: string; items: NavItem[] };

	const groups: NavGroup[] = [
		{
			label: 'Utama',
			items: [
				{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, simpleVisible: true },
				{ href: '/pos', label: 'Kasir (POS)', icon: ShoppingCart, simpleVisible: true }
			]
		},
		{
			label: 'Transaksi',
			items: [
				{ href: '/penjualan', label: 'Penjualan', icon: Receipt },
				{ href: '/products', label: 'Produk & Stok', icon: Package, simpleVisible: true },
				{ href: '/purchases', label: 'Pembelian (PO)', icon: ClipboardList },
				{ href: '/suppliers', label: 'Supplier', icon: Truck }
			]
		},
		{
			label: 'Keuangan',
			items: [
				{ href: '/cashbook', label: 'Buku Kas', icon: Wallet, simpleVisible: true },
				{ href: '/debts', label: 'Hutang & Piutang', icon: Handshake },
				{ href: '/reports', label: 'Laporan', icon: LineChart, simpleVisible: true },
				{ href: '/calculator', label: 'Kalkulator', icon: Calculator }
			]
		},
		{
			label: 'Pelanggan & Tim',
			items: [
				{ href: '/customers', label: 'Pelanggan', icon: Users },
				{ href: '/employees', label: 'Karyawan', icon: UserCog }
			]
		},
		{
			label: 'Lainnya',
			items: [
				{ href: '/ai', label: 'Asisten AI', icon: Sparkles, badge: 'AI' },
				{ href: '/settings', label: 'Pengaturan', icon: Settings, simpleVisible: true }
			]
		}
	];

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		if (href === '/dashboard') return path === '/dashboard';
		return path === href || path.startsWith(href + '/');
	}

	function handleLogout() {
		logout();
		goto('/auth/login');
	}

	function toggleAppMode() {
		const newMode = appModeState.mode === 'simple' ? 'full' : 'simple';
		setAppMode(newMode);
	}
</script>

<div class="flex h-full flex-col bg-paper-dark text-white/80" data-mode={appModeState.mode}>
	<div class="flex items-center justify-between px-5 pt-6 pb-5">
		<a href="/dashboard" class="flex items-center gap-2.5 min-h-0" onclick={onNavigate}>
			<div
				class="w-8 h-8 rounded-lg bg-cta text-white flex items-center justify-center font-bold font-grotesk text-sm -rotate-6 shadow-sm shrink-0"
			>
				B
			</div>
			<span class="font-grotesk font-bold text-lg tracking-tight text-white">Beres</span>
		</a>
		{#if onNavigate}
			<button
				type="button"
				onclick={onNavigate}
				class="lg:hidden text-white/50 hover:text-white p-1 min-h-0"
				aria-label="Tutup menu"
			>
				<X class="w-5 h-5" />
			</button>
		{/if}
	</div>

	<nav class="flex-1 overflow-y-auto px-3 pb-4">
		{#if appModeState.mode === 'full'}
			<button
				type="button"
				onclick={openPalette}
				class="w-full flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-lg text-[13px] font-semibold text-white/45 bg-white/5 hover:bg-white/10 hover:text-white/70 transition-colors min-h-0"
			>
				<Search class="w-[15px] h-[15px] shrink-0" />
				<span class="flex-1 text-left">Cari...</span>
				<kbd class="font-mono text-[10px] border border-white/15 rounded px-1.5 py-0.5 text-white/40">⌘K</kbd>
			</button>
		{/if}
		
		{#each groups as group}
			{@const visibleItems = group.items.filter(item => appModeState.mode === 'full' || item.simpleVisible)}
			{#if visibleItems.length > 0}
				<div class="px-2.5 pt-4 pb-1.5 font-mono text-[10px] uppercase tracking-widest text-white/35">
					{group.label}
				</div>
				{#each visibleItems as item}
					{@const active = isActive(item.href)}
					<a
						href={item.href}
						onclick={onNavigate}
						class="group flex items-center gap-3 px-2.5 rounded-lg font-semibold transition-colors min-h-0
							{appModeState.mode === 'simple' ? 'text-[15px] py-3' : 'text-[13.5px] py-2.5'}
							{active ? 'bg-cta/15 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}"
					>
						<item.icon class="shrink-0 {appModeState.mode === 'simple' ? 'w-[20px] h-[20px]' : 'w-[18px] h-[18px]'} {active ? 'text-cta' : 'text-white/40 group-hover:text-white/70'}" />
						<span class="truncate">{item.label}</span>
						{#if item.badge}
							<span class="ml-auto bg-cta text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
								{item.badge}
							</span>
						{/if}
					</a>
				{/each}
			{/if}
		{/each}
	</nav>

	<div class="px-3 pb-4 pt-2 border-t border-white/10">
		<button
			type="button"
			onclick={toggleAppMode}
			class="w-full flex items-center justify-between px-2.5 py-2 mb-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
		>
			<span class="text-[12px] font-medium text-white/50 group-hover:text-white/80 transition-colors">
				{appModeState.mode === 'simple' ? 'Mode Sederhana' : 'Mode Lengkap'}
			</span>
			<div class="w-8 h-4 rounded-full relative transition-colors duration-300 {appModeState.mode === 'simple' ? 'bg-cta' : 'bg-white/20'}">
				<div class="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm {appModeState.mode === 'simple' ? 'left-4.5' : 'left-0.5'}"></div>
			</div>
		</button>
		
		<div class="flex items-center gap-2.5 px-2.5 py-2 mb-1">
			<div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-grotesk font-bold text-xs text-white shrink-0">
				PT
			</div>
			<div class="min-w-0">
				<div class="text-[12.5px] font-bold text-white truncate">Pemilik Toko</div>
				<div class="text-[10.5px] text-white/40 font-mono truncate">akun aktif</div>
			</div>
		</div>
		<button
			type="button"
			onclick={handleLogout}
			class="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-[13px] font-semibold text-white/50 hover:bg-white/5 hover:text-white transition-colors min-h-0"
		>
			<LogOut class="w-[18px] h-[18px]" />
			Keluar
		</button>
	</div>
</div>
