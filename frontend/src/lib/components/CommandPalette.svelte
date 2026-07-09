<script lang="ts">
	import { goto } from '$app/navigation';
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
		Search,
		PlusCircle,
		CornerDownLeft,
		ArrowUp,
		ArrowDown
	} from '@lucide/svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	type Item = { href: string; label: string; group: string; icon: any; keywords?: string };

	const NAV_ITEMS: Item[] = [
		{ href: '/dashboard', label: 'Dashboard', group: 'Navigasi', icon: LayoutDashboard },
		{ href: '/pos', label: 'Kasir (POS)', group: 'Navigasi', icon: ShoppingCart, keywords: 'jual transaksi' },
		{ href: '/penjualan', label: 'Penjualan', group: 'Navigasi', icon: Receipt, keywords: 'riwayat invoice kwitansi nota struk' },
		{ href: '/products', label: 'Produk & Stok', group: 'Navigasi', icon: Package, keywords: 'barang stok' },
		{ href: '/purchases', label: 'Pembelian (PO)', group: 'Navigasi', icon: ClipboardList },
		{ href: '/suppliers', label: 'Supplier', group: 'Navigasi', icon: Truck },
		{ href: '/cashbook', label: 'Buku Kas', group: 'Navigasi', icon: Wallet, keywords: 'kas uang' },
		{ href: '/debts', label: 'Hutang & Piutang', group: 'Navigasi', icon: Handshake, keywords: 'tagihan' },
		{ href: '/reports', label: 'Laporan', group: 'Navigasi', icon: LineChart },
		{ href: '/calculator', label: 'Kalkulator', group: 'Navigasi', icon: Calculator, keywords: 'margin bep roi' },
		{ href: '/customers', label: 'Pelanggan', group: 'Navigasi', icon: Users },
		{ href: '/employees', label: 'Karyawan', group: 'Navigasi', icon: UserCog, keywords: 'staff pegawai' },
		{ href: '/ai', label: 'Asisten AI', group: 'Navigasi', icon: Sparkles },
		{ href: '/settings', label: 'Pengaturan', group: 'Navigasi', icon: Settings },
		{ href: '/pos', label: 'Transaksi Baru', group: 'Aksi Cepat', icon: PlusCircle, keywords: 'kasir jual' },
		{ href: '/products/new', label: 'Tambah Produk', group: 'Aksi Cepat', icon: PlusCircle },
		{ href: '/customers/new', label: 'Tambah Pelanggan', group: 'Aksi Cepat', icon: PlusCircle },
		{ href: '/cashbook/new', label: 'Catat Transaksi Kas', group: 'Aksi Cepat', icon: PlusCircle },
		{ href: '/debts/new', label: 'Catat Hutang / Piutang', group: 'Aksi Cepat', icon: PlusCircle },
		{ href: '/purchases/new', label: 'Buat PO Baru', group: 'Aksi Cepat', icon: PlusCircle }
	];

	let query = $state('');
	let activeIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return NAV_ITEMS;
		return NAV_ITEMS.filter(
			(item) =>
				item.label.toLowerCase().includes(q) ||
				item.keywords?.toLowerCase().includes(q) ||
				item.group.toLowerCase().includes(q)
		);
	});

	let groupedFiltered = $derived.by(() => {
		const groups: { label: string; items: Item[] }[] = [];
		for (const item of filtered) {
			let g = groups.find((g) => g.label === item.group);
			if (!g) {
				g = { label: item.group, items: [] };
				groups.push(g);
			}
			g.items.push(item);
		}
		return groups;
	});

	function flatList(): Item[] {
		return groupedFiltered.flatMap((g) => g.items);
	}

	function select(item: Item) {
		open = false;
		query = '';
		goto(item.href);
	}

	function handleKeydown(e: KeyboardEvent) {
		const list = flatList();
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, list.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (list[activeIndex]) select(list[activeIndex]);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	// Reset selection whenever the filtered list changes so the highlight never points nowhere.
	$effect(() => {
		filtered;
		activeIndex = 0;
	});

	// Autofocus the input the instant the palette opens.
	$effect(() => {
		if (open && inputEl) {
			inputEl.focus();
		} else if (!open) {
			query = '';
		}
	});

	let flatIdx = 0;
</script>

{#if open}
	<div
		class="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-ink/40 backdrop-blur-[2px]"
		onclick={(e) => { if (e.target === e.currentTarget) open = false; }}
		role="presentation"
	>
		<div class="w-full max-w-xl bg-paper rounded-2xl shadow-2xl border border-border overflow-hidden">
			<div class="flex items-center gap-3 px-4 border-b border-border">
				<Search class="w-[18px] h-[18px] text-ink-faint shrink-0" />
				<input
					bind:this={inputEl}
					bind:value={query}
					onkeydown={handleKeydown}
					type="text"
					placeholder="Cari halaman atau aksi... (produk, kasir, hutang...)"
					class="flex-1 h-14 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-faint min-h-0"
					autocomplete="off"
					spellcheck="false"
				/>
				<kbd class="hidden sm:inline-block font-mono text-[10px] text-ink-faint border border-border rounded px-1.5 py-0.5">ESC</kbd>
			</div>

			<div class="max-h-[50vh] overflow-y-auto py-2">
				{#if groupedFiltered.length === 0}
					<p class="text-center text-sm text-ink-soft py-10">Tidak ada hasil untuk "{query}"</p>
				{/if}
				{#each groupedFiltered as group}
					<div class="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
						{group.label}
					</div>
					{#each group.items as item}
						{@const idx = flatList().indexOf(item)}
						<button
							type="button"
							onclick={() => select(item)}
							onmouseenter={() => (activeIndex = idx)}
							class="w-full flex items-center gap-3 px-4 py-2.5 mx-0 text-left transition-colors min-h-0
								{idx === activeIndex ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-paper-alt'}"
						>
							<item.icon class="w-4 h-4 shrink-0 {idx === activeIndex ? 'text-brand' : 'text-ink-faint'}" />
							<span class="text-[14px] font-semibold truncate">{item.label}</span>
							{#if idx === activeIndex}
								<CornerDownLeft class="w-3.5 h-3.5 ml-auto text-brand shrink-0" />
							{/if}
						</button>
					{/each}
				{/each}
			</div>

			<div class="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-border bg-paper-alt text-[11px] text-ink-faint font-mono">
				<span class="flex items-center gap-1"><ArrowUp class="w-3 h-3" /><ArrowDown class="w-3 h-3" /> navigasi</span>
				<span class="flex items-center gap-1"><CornerDownLeft class="w-3 h-3" /> pilih</span>
				<span class="ml-auto">Beres</span>
			</div>
		</div>
	</div>
{/if}
