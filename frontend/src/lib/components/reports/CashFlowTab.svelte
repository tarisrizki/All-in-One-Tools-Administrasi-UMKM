<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { formatRupiah } from '$lib/utils/format';

	let { cashFlow }: { cashFlow: any } = $props();
</script>

<!-- Net Cash Flow Card -->
<Card.Root class="text-center bg-paper shadow-sm border-border rounded-2xl relative overflow-hidden">
	<div class="absolute -top-6 -right-6 w-24 h-24 bg-brand/5 rounded-full blur-xl"></div>
	<Card.Content class="p-8 relative z-10">
		<p class="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-mono mb-3">
			Arus Kas Bersih (Net Cash Flow)
		</p>
		<p
			class="text-4xl font-black font-grotesk tracking-tight {cashFlow.netCashFlow >= 0
				? 'text-brand'
				: 'text-cta'}"
		>
			{cashFlow.netCashFlow >= 0 ? '+' : ''}{formatRupiah(cashFlow.netCashFlow)}
		</p>
		<p class="text-[11px] font-mono text-ink-soft mt-4 uppercase tracking-widest">
			Uang riil yang tersedia
		</p>
	</Card.Content>
</Card.Root>

<!-- Breakdown Arus Kas -->
<Card.Root class="overflow-hidden bg-paper shadow-sm border-border rounded-2xl relative">
	<!-- Receipt Style Top -->
	<div class="absolute top-0 left-0 w-full h-2 flex justify-between px-2 overflow-hidden opacity-30">
		{#each Array(15) as _}
			<div class="w-3 h-3 bg-surface rounded-full -mt-2"></div>
		{/each}
	</div>

	<!-- CASH IN -->
	<div
		class="p-5 bg-paper-alt border-b border-dashed border-border/60 flex justify-between items-center"
	>
		<h2 class="text-xs font-bold text-success uppercase tracking-widest font-mono">
			Uang Masuk (Cash In)
		</h2>
		<span class="font-bold text-success font-mono text-base"
			>{formatRupiah(cashFlow.cashIn.total)}</span
		>
	</div>
	<Card.Content class="p-5 space-y-3 font-mono text-sm text-ink-soft pb-6">
		<div class="flex justify-between items-center">
			<span>Pendapatan Penjualan Tunai</span>
			<span class="font-bold text-ink">{formatRupiah(cashFlow.cashIn.sales)}</span>
		</div>
		<div class="flex justify-between items-center">
			<span>Pelunasan Piutang</span>
			<span class="font-bold text-ink">{formatRupiah(cashFlow.cashIn.receivable)}</span>
		</div>
		<div class="flex justify-between items-center">
			<span>Pemasukan Lain (Buku Kas)</span>
			<span class="font-bold text-ink">{formatRupiah(cashFlow.cashIn.cashbook)}</span>
		</div>
	</Card.Content>

	<!-- CASH OUT -->
	<div
		class="p-5 bg-paper-alt border-b border-t border-dashed border-border/60 flex justify-between items-center"
	>
		<h2 class="text-xs font-bold text-cta uppercase tracking-widest font-mono">
			Uang Keluar (Cash Out)
		</h2>
		<span class="font-bold text-cta font-mono text-base"
			>{formatRupiah(cashFlow.cashOut.total)}</span
		>
	</div>
	<Card.Content class="p-5 space-y-3 font-mono text-sm text-ink-soft">
		<div class="flex justify-between items-center">
			<span>Pembelian Stok Tunai</span>
			<span class="font-bold text-ink">{formatRupiah(cashFlow.cashOut.purchases)}</span>
		</div>
		<div class="flex justify-between items-center">
			<span>Pembayaran Hutang</span>
			<span class="font-bold text-ink">{formatRupiah(cashFlow.cashOut.payable)}</span>
		</div>
		<div class="flex justify-between items-center">
			<span>Pengeluaran Operasional</span>
			<span class="font-bold text-ink">{formatRupiah(cashFlow.cashOut.cashbook)}</span>
		</div>
	</Card.Content>
</Card.Root>
