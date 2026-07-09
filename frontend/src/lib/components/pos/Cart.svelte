<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Plus, Minus, ShoppingCart, Trash2 } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { formatRupiah } from '$lib/utils/format';

	let {
		cart,
		cartTotal,
		onUpdateQty,
		onClearCart,
		onPayClick
	}: {
		cart: any[];
		cartTotal: number;
		onUpdateQty: (index: number, delta: number) => void;
		onClearCart: () => void;
		onPayClick: () => void;
	} = $props();
</script>

{#if cart.length > 0}
	<aside class="bg-background lg:border-l border-border w-full lg:w-[420px] flex flex-col shrink-0 h-full z-20">
		<div class="p-5 border-b border-dashed border-border font-bold flex justify-between items-center bg-card">
			<div class="flex items-center gap-2 text-ink">
				<ShoppingCart class="w-5 h-5 text-primary" />
				<span class="text-lg font-grotesk tracking-tight">Keranjang ({cart.length})</span>
			</div>
			<Button variant="ghost" size="sm" class="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full font-mono text-[10px] tracking-widest uppercase" onclick={onClearCart}>
				<Trash2 class="w-4 h-4 mr-2" />
				Kosong
			</Button>
		</div>

		<ScrollArea class="flex-1 p-5 bg-card">
			<div class="space-y-4 pr-3 pb-8 font-mono">
				{#each cart as item, i (item.id)}
					<div
						animate:flip={{ duration: 250 }}
						transition:slide={{ duration: 250 }}
						class="flex flex-col gap-2 pb-4 border-b border-dashed border-border/60 last:border-0"
					>
						<div class="flex justify-between items-start">
							<div class="font-bold text-sm text-ink leading-tight pr-2">{item.name}</div>
							<div class="text-ink font-bold text-sm tracking-tighter whitespace-nowrap">{formatRupiah(Number(item.price))}</div>
						</div>
						<div class="flex justify-between items-center mt-1">
							<div class="flex items-center gap-2 bg-muted/50 rounded-full p-0.5 border border-border/50 shrink-0">
								<Button
									variant="ghost"
									size="icon"
									class="w-7 h-7 rounded-full hover:bg-muted text-ink-soft hover:text-ink shrink-0"
									onclick={() => onUpdateQty(i, -1)}
								>
									<Minus class="w-3 h-3" />
								</Button>
								<span class="font-bold text-xs w-6 text-center text-ink">{item.qty}</span>
								<Button
									variant="ghost"
									size="icon"
									class="w-7 h-7 rounded-full hover:bg-muted text-ink-soft hover:text-ink shrink-0"
									onclick={() => onUpdateQty(i, 1)}
								>
									<Plus class="w-3 h-3" />
								</Button>
							</div>
							<div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
								Subtotal: <span class="text-ink ml-1">{formatRupiah(Number(item.price) * item.qty)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</ScrollArea>

		<div class="p-6 border-t-2 border-dashed border-border bg-card mt-auto relative shadow-[0_-10px_20px_rgba(20,22,45,0.02)]">
			<!-- Receipt cutout illusion -->
			<div class="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-background border border-transparent"></div>
			<div class="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-background border border-transparent"></div>
			
			<div class="flex justify-between items-end mb-6">
				<span class="text-[11px] text-muted-foreground font-bold uppercase tracking-widest font-mono">Total Tagihan</span>
				<span class="text-3xl font-black text-ink font-grotesk tracking-tight">{formatRupiah(cartTotal)}</span>
			</div>
			<Button
				variant="default"
				size="lg"
				class="w-full font-bold text-base h-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 bg-primary text-white"
				onclick={onPayClick}
			>
				Bayar Sekarang
			</Button>
		</div>
	</aside>
{/if}
