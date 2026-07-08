<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import type { LocalProduct } from '$lib/db';
	import { fade } from 'svelte/transition';
	import { animate, spring } from '@motionone/dom';
	import { PackageOpen } from 'lucide-svelte';
	import { formatRupiah } from '$lib/utils/format';

	let {
		loading,
		products,
		onAddToCart
	}: {
		loading: boolean;
		products: LocalProduct[];
		onAddToCart: (product: LocalProduct) => void;
	} = $props();

	// Motion One Action
	function motionEntrance(node: HTMLElement, { i }: { i: number }) {
		animate(node, 
			{ opacity: [0, 1], y: [30, 0], scale: [0.95, 1] }, 
			{ delay: i * 0.05, duration: 0.5, easing: spring({ stiffness: 300, damping: 20 }) }
		);
	}
</script>

<ScrollArea class="flex-1 p-4 bg-surface relative">
	{#if loading}
		<div class="text-center py-20 text-muted-foreground flex flex-col items-center justify-center gap-3">
			<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			<p class="font-medium animate-pulse font-mono text-xs uppercase tracking-widest">Memuat produk...</p>
		</div>
	{:else if products.length === 0}
		<div class="text-center py-20 text-ink-soft" in:fade>
			<div class="w-16 h-16 bg-paper border border-dashed border-border rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 text-brand">
				<PackageOpen class="w-8 h-8" />
			</div>
			<p class="font-bold text-lg font-grotesk text-ink">Tidak ada produk ditemukan</p>
			<p class="text-xs mt-1">Coba ubah kata kunci atau kategori filter Anda.</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-24 lg:pb-4 relative z-0">
			{#each products as product, i (product.id)}
				<div
					use:motionEntrance={{ i }}
					class="w-full h-full"
				>
					<Button
						variant="outline"
						class="w-full h-full min-h-[140px] p-4 flex flex-col items-start text-left gap-3 rounded-[14px] border border-border bg-card hover:border-primary hover:shadow-[0_10px_28px_rgba(20,22,45,0.09)] hover:-translate-y-1 transition-all duration-300 group whitespace-normal relative overflow-hidden"
						onclick={() => onAddToCart(product)}
					>
						<!-- Decorative Scrap -->
						<div class="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform duration-500 group-hover:scale-[2]"></div>
						
						<div class="font-bold text-sm sm:text-base text-ink line-clamp-2 min-h-[2.5rem] w-full z-10 leading-snug">
							{product.name}
						</div>
						<div class="w-full z-10 mt-auto pt-3 border-t border-dashed border-border/70 flex flex-col gap-1">
							<div class="text-primary font-bold text-sm sm:text-base font-mono tracking-tight">{formatRupiah(Number(product.price))}</div>
							<div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between items-center w-full">
								<span>Stok</span>
								<span class="px-2 py-0.5 bg-muted rounded text-ink">{product.stock}</span>
							</div>
						</div>
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</ScrollArea>
