<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let activeTab = $state<'profit-loss' | 'cash-flow'>('profit-loss');
	let report = $state<any>(null);
	let cashFlow = $state<any>(null);
	let loading = $state(true);

	// Default to this month
	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

	let startDate = $state(firstDay.toISOString().split('T')[0]);
	let endDate = $state(today.toISOString().split('T')[0]);

	async function fetchReport() {
		loading = true;
		try {
			const query = new URLSearchParams();
			if (startDate && endDate) {
				query.append('startDate', startDate);
				query.append('endDate', endDate);
			}

			// Fetch Profit/Loss
			if (activeTab === 'profit-loss') {
				const res = await fetch(`${API_URL}/v1/reports/profit-loss?${query.toString()}`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				});
				const data = await res.json();
				if (data.success) {
					report = data.data;
				}
			}
			// Fetch Cash Flow
			else {
				const res = await fetch(`${API_URL}/v1/reports/cash-flow?${query.toString()}`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				});
				const data = await res.json();
				if (data.success) {
					cashFlow = data.data;
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function switchTab(tab: 'profit-loss' | 'cash-flow') {
		activeTab = tab;
		fetchReport();
	}

	onMount(() => {
		fetchReport();
	});

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<svelte:head>
	<title>Laporan Keuangan | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex justify-between items-center">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" href="/">
				←
			</Button>
			<h1 class="text-lg font-bold">Laporan Keuangan</h1>
		</div>
	</header>

	<!-- Tabs -->
	<div class="flex border-b bg-background">
		<button
			onclick={() => switchTab('profit-loss')}
			class="flex-1 px-4 py-3 font-bold text-sm transition border-b-2 {activeTab === 'profit-loss'
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground'}"
		>
			Laba Rugi
		</button>
		<button
			onclick={() => switchTab('cash-flow')}
			class="flex-1 px-4 py-3 font-bold text-sm transition border-b-2 {activeTab === 'cash-flow'
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground'}"
		>
			Arus Kas
		</button>
	</div>

	<main class="p-4 max-w-xl mx-auto space-y-6 mt-2">
		<!-- Filter Bar -->
		<Card.Root>
			<Card.Content class="p-4 flex flex-col sm:flex-row gap-3">
				<div class="flex-1 space-y-1">
					<Label for="startDate" class="text-xs font-bold text-muted-foreground">Dari Tanggal</Label>
					<Input
						type="date"
						id="startDate"
						bind:value={startDate}
					/>
				</div>
				<div class="flex-1 space-y-1">
					<Label for="endDate" class="text-xs font-bold text-muted-foreground">Sampai Tanggal</Label>
					<Input
						type="date"
						id="endDate"
						bind:value={endDate}
					/>
				</div>
				<div class="flex items-end">
					<Button
						onclick={fetchReport}
						class="w-full sm:w-auto"
					>
						Terapkan
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		{#if loading}
			<div class="flex justify-center p-8">
				<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else if activeTab === 'profit-loss' && report}
			<!-- Net Profit Card -->
			<Card.Root class="text-center">
				<Card.Content class="p-5">
					<p class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
						Laba / Rugi Bersih
					</p>
					<p class="text-3xl font-bold {report.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}">
						{formatRupiah(report.netProfit)}
					</p>
					<p class="text-xs text-muted-foreground mt-3">Periode: {startDate} s/d {endDate}</p>
				</Card.Content>
			</Card.Root>

			<!-- Breakdown Laba Rugi -->
			<Card.Root class="overflow-hidden">
				<div class="p-4 bg-muted/50 border-b">
					<h2 class="text-sm font-bold uppercase tracking-wider">Rincian Laba Rugi</h2>
				</div>
				<Card.Content class="p-4 space-y-4">
					<div>
						<div class="flex justify-between items-center text-sm mb-1">
							<span>Total Pendapatan (Omzet)</span>
							<span class="font-medium">{formatRupiah(report.totalRevenue)}</span>
						</div>
						<div class="flex justify-between items-center text-sm mb-1">
							<span>Total Harga Pokok (HPP)</span>
							<span class="font-medium text-destructive">-{formatRupiah(report.totalCogs)}</span>
						</div>
						<div class="flex justify-between items-center text-sm pt-2 mt-2 border-t font-bold">
							<span>Laba Kotor Penjualan</span>
							<span>{formatRupiah(report.grossProfit)}</span>
						</div>
					</div>
					<div class="pt-4 border-t">
						<div class="flex justify-between items-center text-sm mb-1">
							<span>Pemasukan Tambahan (Buku Kas)</span>
							<span class="font-medium text-green-600">+{formatRupiah(report.totalCashIncome)}</span>
						</div>
						<div class="flex justify-between items-center text-sm mb-1">
							<span>Pengeluaran Operasional (Buku Kas)</span>
							<span class="font-medium text-destructive">-{formatRupiah(report.totalCashExpense)}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if activeTab === 'cash-flow' && cashFlow}
			<!-- Net Cash Flow Card -->
			<Card.Root class="text-center">
				<Card.Content class="p-5">
					<p class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
						Arus Kas Bersih (Net Cash Flow)
					</p>
					<p class="text-3xl font-bold {cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-destructive'}">
						{cashFlow.netCashFlow >= 0 ? '+' : ''}{formatRupiah(cashFlow.netCashFlow)}
					</p>
					<p class="text-xs text-muted-foreground mt-3">Uang yang benar-benar ada di tangan saat ini</p>
				</Card.Content>
			</Card.Root>

			<!-- Breakdown Arus Kas -->
			<Card.Root class="overflow-hidden">
				<!-- CASH IN -->
				<div class="p-4 bg-muted/50 border-b flex justify-between items-center">
					<h2 class="text-sm font-bold text-green-600 uppercase tracking-wider">
						Uang Masuk (Cash In)
					</h2>
					<span class="font-bold text-green-600">{formatRupiah(cashFlow.cashIn.total)}</span>
				</div>
				<Card.Content class="p-4 space-y-2">
					<div class="flex justify-between items-center text-sm">
						<span>Pendapatan Penjualan Tunai</span>
						<span>{formatRupiah(cashFlow.cashIn.sales)}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span>Pelunasan Piutang Pelanggan</span>
						<span>{formatRupiah(cashFlow.cashIn.receivable)}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span>Pemasukan Lain-lain (Buku Kas)</span>
						<span>{formatRupiah(cashFlow.cashIn.cashbook)}</span>
					</div>
				</Card.Content>

				<!-- CASH OUT -->
				<div class="p-4 bg-muted/50 border-b border-t flex justify-between items-center">
					<h2 class="text-sm font-bold text-destructive uppercase tracking-wider">
						Uang Keluar (Cash Out)
					</h2>
					<span class="font-bold text-destructive">{formatRupiah(cashFlow.cashOut.total)}</span>
				</div>
				<Card.Content class="p-4 space-y-2">
					<div class="flex justify-between items-center text-sm">
						<span>Pembelian Barang / Stok Tunai</span>
						<span>{formatRupiah(cashFlow.cashOut.purchases)}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span>Pembayaran Hutang Supplier</span>
						<span>{formatRupiah(cashFlow.cashOut.payable)}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span>Pengeluaran Operasional (Buku Kas)</span>
						<span>{formatRupiah(cashFlow.cashOut.cashbook)}</span>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</main>
</div>
