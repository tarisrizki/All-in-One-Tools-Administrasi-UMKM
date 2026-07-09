<script lang="ts">
	import { Clock } from '@lucide/svelte';
	import { formatRupiah, formatTime } from '$lib/utils/format';
	import { fly } from 'svelte/transition';

	let {
		isPending,
		transactions = []
	}: {
		isPending: boolean;
		transactions: any[];
	} = $props();

	const DUMMY_TRANSACTIONS = [
		{ label: 'Pembayaran Kasir #TRX-020', time: '10:45', amount: 170000 },
		{ label: 'Pembayaran Kasir #TRX-019', time: '09:12', amount: 75000 },
		{ label: 'Pembayaran Kasir #TRX-018', time: '08:33', amount: 128000 }
	];
</script>

<div>
	<h3 class="font-mono text-[10px] uppercase tracking-widest text-ink-faint font-bold mb-4 flex items-center gap-2">
		<Clock class="w-3 h-3" /> Aktivitas Terakhir
	</h3>
	<div class="space-y-3">
		{#if isPending}
			{#each Array(3) as _}
				<div class="flex justify-between items-center">
					<div class="space-y-1.5">
						<div class="h-3 w-40 bg-border/50 rounded animate-pulse"></div>
						<div class="h-2.5 w-20 bg-border/30 rounded animate-pulse"></div>
					</div>
					<div class="h-3 w-20 bg-border/50 rounded animate-pulse"></div>
				</div>
			{/each}
		{:else if transactions?.length > 0}
			{#each transactions.slice(0, 5) as tx, i}
				<div
					class="flex justify-between items-center py-1"
					in:fly={{ x: -10, duration: 300, delay: i * 50 }}
				>
					<div>
						<p class="font-semibold text-ink text-sm">
							{tx.invoiceNumber || `#TRX-${String(i + 1).padStart(3, '0')}`}
						</p>
						<p class="text-[10px] text-ink-faint font-mono">{formatTime(tx.createdAt)}</p>
					</div>
					<div class="font-bold text-success font-mono text-sm">
						+ {formatRupiah(parseFloat(tx.grandTotal))}
					</div>
				</div>
			{/each}
		{:else}
			{#each DUMMY_TRANSACTIONS as tx, i}
				<div
					class="flex justify-between items-center py-1"
					in:fly={{ x: -10, duration: 300, delay: i * 50 }}
				>
					<div>
						<p class="font-semibold text-ink text-sm">{tx.label}</p>
						<p class="text-[10px] text-ink-faint font-mono">{tx.time} AM</p>
					</div>
					<div class="font-bold text-success font-mono text-sm">+ {formatRupiah(tx.amount)}</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
