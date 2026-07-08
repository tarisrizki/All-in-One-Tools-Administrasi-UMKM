<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { formatRupiah, formatDate, isOverdue } from '$lib/utils/format';
	import { Handshake, Plus } from 'lucide-svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

	let activeTab = $state<'payable' | 'receivable'>('receivable');
	let debts = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	const tabs = [
		{ key: 'receivable', label: 'Piutang (Pelanggan)' },
		{ key: 'payable', label: 'Hutang (Supplier)' }
	];

	async function fetchDebts() {
		loading = true;
		try {
			const token = localStorage.getItem('umkm_token');
			const res = await fetch(`${API_URL}/v1/debts?type=${activeTab}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const json = await res.json();
			if (json.success) {
				debts = json.data;
				error = '';
			} else {
				error = json.error?.message || 'Gagal memuat data';
			}
		} catch {
			error = 'Gagal mengambil data hutang/piutang';
		} finally {
			loading = false;
		}
	}

	function handleTabSelect(tab: string) {
		activeTab = tab as typeof activeTab;
		fetchDebts();
	}

	onMount(() => {
		fetchDebts();
	});
</script>

<svelte:head>
	<title>Hutang & Piutang — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Buku Hutang Piutang" subtitle="Kelola Tagihan">
		{#snippet actions()}
			<Button
				href="/debts/new"
				size="sm"
				class="rounded-full bg-brand hover:bg-brand-dark text-white font-bold shadow-md hover:-translate-y-0.5 transition-all gap-1.5 h-10 px-4"
			>
				<Plus class="w-4 h-4" />
				<span class="hidden sm:inline">Catat Baru</span>
			</Button>
		{/snippet}
	</PageHeader>

	<TabBar {tabs} active={activeTab} onSelect={handleTabSelect} />

	<main class="p-4 sm:p-6 container-base mt-4 flex-1">
		{#if loading}
			<LoadingSpinner message="Memuat data hutang..." />
		{:else if error}
			<div class="bg-danger/10 text-danger p-4 rounded-xl border border-danger/20 font-mono text-sm">
				{error}
			</div>
		{:else if debts.length === 0}
			<EmptyState
				icon={Handshake}
				title="Belum Ada Data"
				description="Anda belum memiliki catatan {activeTab === 'receivable' ? 'piutang dari pelanggan' : 'hutang ke supplier'}."
				actionHref="/debts/new"
				actionLabel="+ Catat Sekarang"
			/>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each debts as debt}
					<a href="/debts/{debt.id}" class="block group">
						<Card.Root
							class="hover:border-brand/40 transition-all duration-200 h-full flex flex-col shadow-sm hover:shadow-md bg-paper border-border rounded-2xl overflow-hidden"
						>
							<Card.Content class="p-5 flex-1 flex flex-col">
								<div class="flex justify-between items-start mb-3">
									<div class="min-w-0 flex-1">
										<h3
											class="font-bold text-lg font-grotesk text-ink truncate pr-2 group-hover:text-brand transition-colors"
										>
											{debt.entity_name}
										</h3>
										{#if debt.entity_phone}
											<div class="text-xs text-ink-soft mt-1 font-mono">{debt.entity_phone}</div>
										{/if}
									</div>
									{#if debt.status === 'unpaid'}
										<Badge
											variant="destructive"
											class="whitespace-nowrap text-[10px] font-bold font-mono tracking-wider shrink-0"
											>BELUM LUNAS</Badge
										>
									{:else if debt.status === 'partial'}
										<Badge
											variant="outline"
											class="bg-warning-soft text-warning border-transparent whitespace-nowrap text-[10px] font-bold font-mono tracking-wider shrink-0"
											>CICILAN</Badge
										>
									{:else if debt.status === 'paid'}
										<Badge
											variant="outline"
											class="bg-brand-soft text-brand border-transparent whitespace-nowrap text-[10px] font-bold font-mono tracking-wider shrink-0"
											>LUNAS</Badge
										>
									{/if}
								</div>

								<div class="mt-auto space-y-2 pt-2">
									<div class="flex justify-between items-center text-sm">
										<span class="text-ink-soft font-mono text-xs">Total Tagihan:</span>
										<span class="font-bold font-mono text-ink">{formatRupiah(debt.amount)}</span>
									</div>
									<div class="flex justify-between items-center text-sm">
										<span class="text-ink-soft font-bold font-mono text-xs">Sisa Tagihan:</span>
										<span
											class="font-bold font-mono {debt.status === 'paid' ? 'text-brand' : 'text-cta'}"
										>
											{formatRupiah(debt.remaining_amount)}
										</span>
									</div>
								</div>

								<div class="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
									<span class="text-ink-soft font-mono">Jatuh Tempo:</span>
									<span
										class="font-semibold font-mono {debt.status !== 'paid' && isOverdue(debt.due_date)
											? 'text-cta font-bold'
											: 'text-ink-soft'}"
									>
										{formatDate(debt.due_date)}
										{#if debt.status !== 'paid' && isOverdue(debt.due_date)}
											<span class="text-cta">(TERLAMBAT)</span>
										{/if}
									</span>
								</div>
							</Card.Content>
						</Card.Root>
					</a>
				{/each}
			</div>
		{/if}
	</main>
</div>
