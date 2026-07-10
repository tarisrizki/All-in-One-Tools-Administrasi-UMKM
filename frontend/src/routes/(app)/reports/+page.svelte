<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { FileText, Download } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ProfitLossTab from '$lib/components/reports/ProfitLossTab.svelte';
	import CashFlowTab from '$lib/components/reports/CashFlowTab.svelte';
	import SalesTab from '$lib/components/reports/SalesTab.svelte';
	import InventoryTab from '$lib/components/reports/InventoryTab.svelte';

	let activeTab = $state<'profit-loss' | 'cash-flow' | 'sales' | 'inventory'>('profit-loss');
	let report = $state<any>(null);
	let cashFlow = $state<any>(null);
	let loading = $state(true);

	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

	let startDate = $state(firstDay.toISOString().split('T')[0]);
	let endDate = $state(today.toISOString().split('T')[0]);

	const tabs = [
		{ key: 'profit-loss', label: 'Laba Rugi' },
		{ key: 'cash-flow', label: 'Arus Kas' },
		{ key: 'sales', label: 'Penjualan' },
		{ key: 'inventory', label: 'Inventori' }
	];

	async function fetchReport() {
		loading = true;
		try {
			const query = new URLSearchParams();
			if (startDate && endDate) {
				query.append('startDate', startDate);
				query.append('endDate', endDate);
			}

			if (activeTab === 'profit-loss') {
				const data = await apiClient(`/reports/profit-loss?${query.toString()}`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				});
				if (data.success) report = data.data;
			} else if (activeTab === 'cash-flow') {
				const data = await apiClient(`/reports/cash-flow?${query.toString()}`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				});
				if (data.success) cashFlow = data.data;
			} else if (activeTab === 'sales') {
				const data = await apiClient(`/reports/sales?${query.toString()}`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				});
				if (data.success) report = data.data;
			} else if (activeTab === 'inventory') {
				const data = await apiClient(`/reports/inventory?${query.toString()}`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				});
				if (data.success) report = data.data;
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function handleTabSelect(tab: string) {
		activeTab = tab as 'profit-loss' | 'cash-flow' | 'sales' | 'inventory';
		report = null;
		cashFlow = null;
		fetchReport();
	}

	async function handleExport(format: 'pdf' | 'excel') {
		try {
			const query = new URLSearchParams();
			query.append('tab', activeTab);
			query.append('format', format);
			if (startDate && endDate) {
				query.append('startDate', startDate);
				query.append('endDate', endDate);
			}

			toast.loading(`Mengunduh laporan ${format.toUpperCase()}...`);

			const res = await apiClient(`/reports/export?${query.toString()}`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});

			if (!res.ok) throw new Error('Gagal mengunduh laporan');

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Laporan_${activeTab}_${startDate}_${endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			toast.success('Berhasil mengunduh laporan');
		} catch (e: any) {
			toast.error(e.message || 'Gagal mengunduh laporan');
		}
	}

	onMount(() => {
		fetchReport();
	});
</script>

<svelte:head>
	<title>Laporan Keuangan — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Laporan Keuangan" subtitle="Analisis Usaha">
		{#snippet actions()}
			<Button
				variant="ghost"
				size="icon"
				onclick={() => fetchReport()}
				class="rounded-full text-ink-soft hover:text-brand"
				aria-label="Refresh laporan"
			>
				<FileText class="w-4 h-4" />
			</Button>
		{/snippet}
	</PageHeader>

	<TabBar {tabs} active={activeTab} onSelect={handleTabSelect} />

	<main class="p-4 sm:p-6 container-base space-y-6 mt-4 flex-1">
		<!-- Filter Bar -->
		{#if activeTab !== 'inventory'}
			<Card.Root class="bg-paper shadow-sm border-border rounded-2xl overflow-hidden relative animate-in fade-in slide-in-from-top-4">
				<div class="absolute top-0 right-8 w-6 h-3 bg-surface rounded-b-full border-b border-l border-r border-border"></div>

				<Card.Content class="p-5 flex flex-col sm:flex-row gap-4">
					<div class="flex-1 space-y-1.5">
						<Label
							for="startDate"
							class="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-mono"
							>Dari Tanggal</Label
						>
						<Input
							type="date"
							id="startDate"
							bind:value={startDate}
							class="h-11 rounded-xl border-border bg-muted/30 focus-visible:ring-brand font-mono text-ink text-sm"
						/>
					</div>
					<div class="flex-1 space-y-1.5">
						<Label
							for="endDate"
							class="text-[10px] font-bold text-ink-soft uppercase tracking-widest font-mono"
							>Sampai Tanggal</Label
						>
						<Input
							type="date"
							id="endDate"
							bind:value={endDate}
							class="h-11 rounded-xl border-border bg-muted/30 focus-visible:ring-brand font-mono text-ink text-sm"
						/>
					</div>
					<div class="flex items-end pt-1">
						<Button
							onclick={fetchReport}
							class="w-full sm:w-auto h-11 rounded-xl font-bold bg-brand hover:bg-brand-dark text-white shadow-md hover:-translate-y-0.5 transition-all px-6"
						>
							Terapkan
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Export Buttons -->
		<div class="flex gap-3 w-full">
			<Button
				variant="outline"
				class="flex-1 h-11 rounded-xl font-bold border-dashed border-border text-ink-soft hover:text-ink shadow-sm gap-2"
				onclick={() => handleExport('pdf')}
			>
				<Download class="w-4 h-4" /> Ekspor PDF
			</Button>
			<Button
				variant="outline"
				class="flex-1 h-11 rounded-xl font-bold border-dashed border-border text-ink-soft hover:text-ink shadow-sm gap-2"
				onclick={() => handleExport('excel')}
			>
				<Download class="w-4 h-4" /> Ekspor Excel
			</Button>
		</div>

		{#if loading}
			<LoadingSpinner message="Menyusun laporan..." />
		{:else if activeTab === 'profit-loss' && report}
			<ProfitLossTab {report} {startDate} {endDate} />
		{:else if activeTab === 'cash-flow' && cashFlow}
			<CashFlowTab {cashFlow} />
		{:else if activeTab === 'sales' && report}
			<SalesTab {report} {startDate} {endDate} />
		{:else if activeTab === 'inventory' && report}
			<InventoryTab {report} />
		{:else}
			<div class="flex flex-col items-center justify-center p-12 gap-3 text-ink-soft">
				<FileText class="w-10 h-10 opacity-30" />
				<p class="font-mono text-xs uppercase tracking-widest">Tidak ada data laporan</p>
			</div>
		{/if}
	</main>
</div>
