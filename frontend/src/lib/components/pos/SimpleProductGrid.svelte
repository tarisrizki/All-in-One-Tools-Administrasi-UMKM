<script lang="ts">
	import type { LocalProduct } from '$lib/db';
	import { formatRupiah } from '$lib/utils/format';
	import { fade, scale } from 'svelte/transition';
	import { PackageOpen } from '@lucide/svelte';

	let {
		loading,
		products,
		cart,
		onAddToCart
	}: {
		loading: boolean;
		products: LocalProduct[];
		cart: any[];
		onAddToCart: (product: LocalProduct) => void;
	} = $props();

	// Cycle through brand colors for tiles
	const TILE_COLORS = [
		{ color: 'var(--color-brand)', bg: 'var(--color-brand-soft)' },
		{ color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
		{ color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
		{ color: 'var(--color-cta)', bg: 'var(--color-cta-soft)' },
	];

	function getCartQty(productId: string): number {
		return cart.find((i: any) => i.id === productId)?.qty || 0;
	}
</script>

<div class="flex-1 overflow-auto p-4">
	{#if loading}
		<div class="text-center py-20 text-ink-soft flex flex-col items-center gap-3">
			<div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
			<p class="font-mono text-xs uppercase tracking-widest animate-pulse">Memuat produk...</p>
		</div>
	{:else if products.length === 0}
		<div class="text-center py-20 text-ink-soft" in:fade>
			<div class="w-16 h-16 bg-paper border border-dashed border-border rounded-2xl flex items-center justify-center mx-auto mb-4">
				<PackageOpen class="w-8 h-8 text-brand" />
			</div>
			<p class="font-bold text-lg font-grotesk text-ink">Tidak ada produk ditemukan</p>
			<p class="text-xs mt-1">Coba ubah kata kunci atau tambah produk baru.</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 md:grid-cols-3 gap-3 pb-28">
			{#each products as product, i (product.id)}
				{@const scheme = TILE_COLORS[i % TILE_COLORS.length]}
				{@const qty = getCartQty(product.id)}
				<button
					onclick={() => onAddToCart(product)}
					in:scale={{ duration: 200, delay: i * 30 }}
					class="relative h-24 rounded-[18px] p-4 flex flex-col justify-between text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer border-none shadow-sm"
					style="background: {scheme.bg};"
					disabled={product.stock <= 0}
				>
					<!-- Cart quantity badge -->
					{#if qty > 0}
						<div
							class="absolute top-2 right-2 min-w-[22px] h-[22px] rounded-full flex items-center justify-center font-grotesk font-bold text-[11px] text-white px-1.5 shadow-sm"
							style="background: {scheme.color};"
							in:scale={{ duration: 150 }}
						>
							{qty}
						</div>
					{/if}

					<!-- Out of stock overlay -->
					{#if product.stock <= 0}
						<div class="absolute inset-0 rounded-[18px] bg-paper/60 flex items-center justify-center">
							<span class="font-bold text-xs text-ink-soft font-mono uppercase tracking-wider">Habis</span>
						</div>
					{/if}

					<div class="font-grotesk font-bold text-[13.5px] text-ink line-clamp-1 pr-6">{product.name}</div>
					<div class="font-sans text-[12.5px] font-semibold" style="color: {scheme.color};">
						{formatRupiah(Number(product.price))}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
