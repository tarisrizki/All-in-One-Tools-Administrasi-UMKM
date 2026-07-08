<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { formatRupiah } from '$lib/utils/format';

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

<!-- Net Profit Card -->
<Card.Root class="text-center bg-paper shadow-sm border-border rounded-2xl relative overflow-hidden">
	<div class="absolute -top-6 -right-6 w-24 h-24 bg-brand/5 rounded-full blur-xl"></div>
	<Card.Content class="p-8 relative z-10">
		<p class="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-mono mb-3">
			Laba / Rugi Bersih
		</p>
		<p
			class="text-4xl font-black font-grotesk tracking-tight {report.netProfit >= 0
				? 'text-brand'
				: 'text-cta'}"
		>
			{formatRupiah(report.netProfit)}
		</p>
		<p class="text-[11px] font-mono text-ink-soft mt-4 uppercase tracking-widest">
			Periode: {startDate} s/d {endDate}
		</p>
	</Card.Content>
</Card.Root>

<!-- Breakdown Laba Rugi -->
<Card.Root class="overflow-hidden bg-paper shadow-sm border-border rounded-2xl relative">
	<!-- Receipt Style Top -->
	<div class="absolute top-0 left-0 w-full h-2 flex justify-between px-2 overflow-hidden opacity-30">
		{#each Array(15) as _}
			<div class="w-3 h-3 bg-surface rounded-full -mt-2"></div>
		{/each}
	</div>

	<div class="p-5 bg-paper-alt border-b border-dashed border-border/60">
		<h2 class="text-xs font-bold uppercase tracking-widest font-mono text-ink">Rincian Laba Rugi</h2>
	</div>
	<Card.Content class="p-5 space-y-5 font-mono text-sm">
		<div>
			<div class="flex justify-between items-center mb-2">
				<span class="text-ink-soft">Total Pendapatan (Omzet)</span>
				<span class="font-bold text-ink">{formatRupiah(report.totalRevenue)}</span>
			</div>
			<div class="flex justify-between items-center mb-3">
				<span class="text-ink-soft">Total Harga Pokok (HPP)</span>
				<span class="font-bold text-cta">-{formatRupiah(report.totalCogs)}</span>
			</div>
			<div
				class="flex justify-between items-center pt-3 border-t border-dashed border-border/70 font-bold text-base"
			>
				<span class="text-ink font-grotesk tracking-tight">Laba Kotor Penjualan</span>
				<span class="text-ink">{formatRupiah(report.grossProfit)}</span>
			</div>
		</div>
		<div class="pt-5 border-t border-dashed border-border/70">
			<div class="flex justify-between items-center mb-2">
				<span class="text-ink-soft">Pemasukan Tambahan</span>
				<span class="font-bold text-success">+{formatRupiah(report.totalCashIncome)}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-ink-soft">Pengeluaran Operasional</span>
				<span class="font-bold text-cta">-{formatRupiah(report.totalCashExpense)}</span>
			</div>
		</div>
	</Card.Content>
</Card.Root>
