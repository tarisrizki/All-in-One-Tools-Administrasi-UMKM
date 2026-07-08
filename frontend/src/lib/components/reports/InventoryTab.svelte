<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { formatRupiah } from '$lib/utils/format';
	import { Box, AlertTriangle, PackageSearch } from 'lucide-svelte';

	let {
		report
	}: {
		report: any;
	} = $props();
</script>

<!-- Stock Value Card -->
<Card.Root class="text-center bg-paper shadow-sm border-border rounded-2xl relative overflow-hidden">
	<div class="absolute -top-6 -right-6 w-24 h-24 bg-brand/5 rounded-full blur-xl"></div>
	<Card.Content class="p-8 relative z-10">
		<p class="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-mono mb-3">
			Total Nilai Aset Stok
		</p>
		<p class="text-4xl font-black font-grotesk tracking-tight text-brand">
			{formatRupiah(report.totalStockValue)}
		</p>
		<p class="text-[11px] font-mono text-ink-soft mt-4 uppercase tracking-widest">
			Dihitung berdasarkan Harga Pokok Penjualan (HPP)
		</p>
	</Card.Content>
</Card.Root>

<!-- Low Stock Warning / Inventory List -->
<Card.Root class="overflow-hidden bg-paper shadow-sm border-border rounded-2xl relative">
	<div class="p-5 bg-paper-alt border-b border-dashed border-border/60 flex items-center justify-between">
		<h2 class="text-xs font-bold uppercase tracking-widest font-mono text-ink">Peringatan Stok Menipis</h2>
		<AlertTriangle class="w-4 h-4 text-warning" />
	</div>
	<Card.Content class="p-0">
		{#if report.lowStock && report.lowStock.length > 0}
			<div class="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
				{#each report.lowStock as item}
					<div class="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
								<Box class="w-5 h-5" />
							</div>
							<div>
								<p class="font-bold text-ink text-sm">{item.name}</p>
								<p class="text-[10px] text-ink-soft font-mono mt-1">
									Minimal: {item.minStock}
								</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-black text-xl {item.stock <= 0 ? 'text-cta' : 'text-warning'} font-grotesk">
								{item.stock}
							</p>
							<p class="text-[10px] text-ink-soft font-mono uppercase">Tersisa</p>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-10 flex flex-col items-center justify-center text-center text-ink-soft">
				<PackageSearch class="w-8 h-8 mb-3 opacity-30 text-success" />
				<p class="text-sm font-bold font-mono uppercase tracking-widest text-success">Stok Aman</p>
				<p class="text-xs mt-1">Tidak ada produk yang mendekati batas minimum.</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
