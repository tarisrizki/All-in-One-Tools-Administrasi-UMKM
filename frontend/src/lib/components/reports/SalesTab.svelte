<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { formatRupiah } from '$lib/utils/format';
	import { TrendingUp, Package } from '@lucide/svelte';

	let {
		report,
		startDate,
		endDate
	}: {
		report: any;
		startDate: string;
		endDate: string;
	} = $props();
</script>

<!-- Revenue Card -->
<Card.Root class="text-center bg-paper shadow-sm border-border rounded-2xl relative overflow-hidden">
	<div class="absolute -top-6 -right-6 w-24 h-24 bg-brand/5 rounded-full blur-xl"></div>
	<Card.Content class="p-8 relative z-10">
		<p class="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-mono mb-3">
			Total Pendapatan
		</p>
		<p class="text-4xl font-black font-grotesk tracking-tight text-brand">
			{formatRupiah(report.totalRevenue)}
		</p>
		<p class="text-[11px] font-mono text-ink-soft mt-4 uppercase tracking-widest">
			Periode: {startDate} s/d {endDate} &bull; {report.totalTransactions} Transaksi
		</p>
	</Card.Content>
</Card.Root>

<!-- Top Products -->
<Card.Root class="overflow-hidden bg-paper shadow-sm border-border rounded-2xl relative">
	<div class="p-5 bg-paper-alt border-b border-dashed border-border/60 flex items-center justify-between">
		<h2 class="text-xs font-bold uppercase tracking-widest font-mono text-ink">10 Produk Terlaris</h2>
		<TrendingUp class="w-4 h-4 text-brand" />
	</div>
	<Card.Content class="p-0">
		{#if report.topProducts && report.topProducts.length > 0}
			<div class="divide-y divide-border/50">
				{#each report.topProducts as product, i}
					<div class="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
						<div class="flex items-center gap-4">
							<div class="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold font-mono text-sm">
								{i + 1}
							</div>
							<div>
								<p class="font-bold text-ink text-sm">{product.name}</p>
								<p class="text-[10px] text-ink-soft font-mono mt-1">
									Terjual: {product.qty}
								</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-bold text-brand text-sm">{formatRupiah(product.revenue)}</p>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-10 flex flex-col items-center justify-center text-center text-ink-soft">
				<Package class="w-8 h-8 mb-3 opacity-30" />
				<p class="text-sm font-bold font-mono uppercase tracking-widest">Belum ada penjualan</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
