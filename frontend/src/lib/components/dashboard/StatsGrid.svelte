<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { TrendingUp, AlertTriangle } from 'lucide-svelte';
	import { formatRupiah } from '$lib/utils/format';
	import { fade } from 'svelte/transition';

	let {
		isPending,
		data
	}: {
		isPending: boolean;
		data: any;
	} = $props();
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
	<!-- Penjualan Hari Ini -->
	<Card.Root class="border-border shadow-sm hover:shadow-md transition-shadow">
		<Card.Content class="p-4">
			<p class="text-[11px] font-semibold text-ink-soft mb-2 uppercase tracking-wider font-mono">
				Penjualan Hari Ini
			</p>
			{#if isPending}
				<div class="h-6 w-24 bg-border/50 rounded animate-pulse"></div>
			{:else}
				<p class="font-mono font-bold text-lg md:text-xl text-ink" transition:fade>
					{formatRupiah(data?.todaySales || 0)}
				</p>
				<p class="text-[10px] font-bold text-success mt-1 flex items-center gap-0.5">
					<TrendingUp class="w-3 h-3" /> 12% dari kemarin
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Total Transaksi -->
	<Card.Root class="border-border shadow-sm hover:shadow-md transition-shadow">
		<Card.Content class="p-4">
			<p class="text-[11px] font-semibold text-ink-soft mb-2 uppercase tracking-wider font-mono">
				Total Transaksi
			</p>
			{#if isPending}
				<div class="h-6 w-12 bg-border/50 rounded animate-pulse"></div>
			{:else}
				<p class="font-mono font-bold text-lg md:text-xl text-ink" transition:fade>
					{data?.todayTransactions || 0}
				</p>
				<p class="text-[10px] text-ink-faint mt-1 font-mono">transaksi hari ini</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Stok Menipis -->
	<Card.Root class="border-warning/30 bg-warning-soft shadow-sm">
		<Card.Content class="p-4">
			<p class="text-[11px] font-semibold text-warning-dark mb-2 uppercase tracking-wider font-mono">
				Stok Menipis
			</p>
			<p class="font-mono font-bold text-lg md:text-xl text-warning-dark flex items-center gap-1">
				<AlertTriangle class="w-4 h-4" />
				{data?.lowStockCount || 2} Produk
			</p>
			<a href="/products" class="text-[10px] font-bold text-warning-dark mt-1 block hover:underline">
				Lihat stok &rarr;
			</a>
		</Card.Content>
	</Card.Root>

	<!-- Untung Bersih -->
	<Card.Root class="border-success/30 bg-success-soft shadow-sm">
		<Card.Content class="p-4">
			<p
				class="text-[11px] font-semibold text-success-dark mb-2 uppercase tracking-wider font-mono"
			>
				Untung Bersih (Est.)
			</p>
			{#if isPending}
				<div class="h-6 w-28 bg-success/20 rounded animate-pulse"></div>
			{:else}
				<p class="font-mono font-bold text-lg md:text-xl text-success-dark" transition:fade>
					{formatRupiah(data?.estimatedProfit || 0)}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
