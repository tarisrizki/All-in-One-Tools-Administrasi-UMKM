<script lang="ts">
	import { apiClient } from '$lib/utils/api';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Search, Receipt, FileText } from '@lucide/svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ReceiptModal from '$lib/components/pos/ReceiptModal.svelte';
	import { formatRupiah, formatDate } from '$lib/utils/format';

	let sales = $state<any[]>([]);
	let loading = $state(true);
	let search = $state('');
	let page = $state(1);
	let totalPages = $state(1);

	let activeSaleId = $state<string | null>(null);
	let showReceipt = $state(false);

	let searchTimer: ReturnType<typeof setTimeout>;

	async function fetchSales() {
		loading = true;
		try {
			const params = new URLSearchParams({ page: String(page), limit: '20' });
			if (search.trim()) params.set('search', search.trim());
			const json = await apiClient(`/sales?${params}`);
			if (json.success) {
				sales = json.data;
				totalPages = Math.max(Math.ceil((json.pagination?.total || 0) / 20), 1);
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			page = 1;
			fetchSales();
		}, 300);
	}

	function openReceipt(id: string) {
		activeSaleId = id;
		showReceipt = true;
	}

	onMount(fetchSales);
</script>

<svelte:head>
	<title>Riwayat Penjualan — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Riwayat Penjualan" subtitle="Semua Transaksi Kasir" />

	<main class="p-4 sm:p-6 container-base mt-4 flex-1">
		<div class="mb-4 max-w-sm">
			<div class="relative">
				<Search class="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
				<Input
					bind:value={search}
					oninput={onSearchInput}
					placeholder="Cari no. invoice atau nama pelanggan..."
					class="pl-10 h-11 rounded-xl border-border bg-paper"
				/>
			</div>
		</div>

		{#if loading}
			<LoadingSpinner message="Memuat riwayat transaksi..." />
		{:else if sales.length === 0}
			<EmptyState
				icon={Receipt}
				title="Belum Ada Transaksi"
				description="Transaksi yang selesai lewat Kasir (POS) akan muncul di sini, lengkap dengan invoice, kwitansi, nota, dan surat jalan."
				actionHref="/pos"
				actionLabel="Buka Kasir"
			/>
		{:else}
			<div class="rounded-2xl border border-border bg-paper overflow-hidden">
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row class="bg-paper-alt hover:bg-paper-alt border-b-border">
								<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">No. Invoice</Table.Head>
								<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Pelanggan</Table.Head>
								<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Tanggal</Table.Head>
								<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Metode</Table.Head>
								<Table.Head class="text-right font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Total</Table.Head>
								<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Status</Table.Head>
								<Table.Head class="text-right font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Dokumen</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each sales as sale}
								<Table.Row class="hover:bg-muted/40 border-b-border/60">
									<Table.Cell class="font-bold font-mono text-ink">{sale.invoiceNumber}</Table.Cell>
									<Table.Cell class="text-ink">{sale.customerName || 'Pelanggan Umum'}</Table.Cell>
									<Table.Cell class="text-ink-soft">{formatDate(sale.createdAt)}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline" class="bg-brand-soft text-brand border-transparent font-bold uppercase text-[10px]">
											{sale.paymentMethod}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-right font-bold font-mono text-ink">{formatRupiah(sale.grandTotal)}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline" class="bg-success-soft text-success-dark border-transparent font-bold uppercase text-[10px]">
											{sale.status === 'paid' ? 'Lunas' : sale.status}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button
											variant="ghost"
											size="sm"
											class="text-brand font-bold rounded-lg gap-1.5"
											onclick={() => openReceipt(sale.id)}
										>
											<FileText class="w-3.5 h-3.5" />
											Lihat
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			{#if totalPages > 1}
				<div class="flex items-center justify-center gap-3 mt-6">
					<Button variant="outline" size="sm" disabled={page <= 1} onclick={() => { page--; fetchSales(); }} class="rounded-lg border-border">
						Sebelumnya
					</Button>
					<span class="text-xs font-mono text-ink-soft">Halaman {page} / {totalPages}</span>
					<Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => { page++; fetchSales(); }} class="rounded-lg border-border">
						Berikutnya
					</Button>
				</div>
			{/if}
		{/if}
	</main>
</div>

{#if showReceipt && activeSaleId}
	<ReceiptModal
		open={showReceipt}
		transactionId={activeSaleId}
		onClose={() => (showReceipt = false)}
		onNewTransaction={() => (showReceipt = false)}
	/>
{/if}
