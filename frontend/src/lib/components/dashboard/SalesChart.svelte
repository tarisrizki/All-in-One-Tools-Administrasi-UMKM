<script lang="ts">
	import { BarChart2 } from 'lucide-svelte';
	import { formatRupiah, formatDateShort } from '$lib/utils/format';
	import { fly } from 'svelte/transition';

	let {
		isPending,
		weeklyData = []
	}: {
		isPending: boolean;
		weeklyData: { date: string; total: number }[];
	} = $props();

	let maxWeekly = $derived(
		weeklyData?.length > 0 ? Math.max(...weeklyData.map((d) => d.total), 1) : 1
	);
</script>

<div>
	<div class="flex items-center justify-between mb-4">
		<h2 class="font-grotesk font-bold text-base text-ink flex items-center gap-2">
			<BarChart2 class="w-4 h-4 text-brand" />
			Tren Penjualan (7 Hari)
		</h2>
		<div class="flex gap-1">
			{#each [1, 2, 3] as _}
				<span class="w-1.5 h-1.5 rounded-full bg-border"></span>
			{/each}
		</div>
	</div>

	<div class="h-36 flex items-end gap-1.5 md:gap-2.5 px-1 pb-6 relative">
		{#if isPending}
			{#each Array(7) as _, i}
				<div
					class="flex-1 bg-border/40 rounded-t animate-pulse"
					style="height: {30 + i * 10}%"
				></div>
			{/each}
		{:else if weeklyData?.length > 0}
			{#each weeklyData as day, i}
				<div
					class="relative flex flex-col justify-end flex-1 h-full group cursor-default"
					in:fly={{ y: 20, duration: 400, delay: i * 60 }}
				>
					<!-- Tooltip -->
					<div
						class="absolute -top-10 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-y-0.5 whitespace-nowrap z-20 pointer-events-none shadow-lg font-mono"
					>
						{formatRupiah(day.total)}
					</div>
					<!-- Bar -->
					<div
						class="w-full rounded-t-md rounded-b-sm transition-all duration-500
							{i === weeklyData.length - 1
							? 'bg-gradient-to-b from-cta to-cta-dark'
							: 'bg-gradient-to-b from-brand to-brand-dark'}"
						style="height: {day.total === 0 ? '4px' : Math.max((day.total / maxWeekly) * 100, 5)}%"
					></div>
					<!-- Date label -->
					<div
						class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-ink-faint font-mono font-semibold whitespace-nowrap"
					>
						{formatDateShort(day.date)}
					</div>
				</div>
			{/each}
		{:else}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-faint">
				<BarChart2 class="w-10 h-10 opacity-30" />
				<p class="text-xs font-mono">Belum ada data grafik.</p>
			</div>
		{/if}
	</div>
</div>
