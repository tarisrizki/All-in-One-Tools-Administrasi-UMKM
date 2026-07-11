<script lang="ts">
	import { apiClient } from '$lib/utils/api';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { appModeState } from '$lib/stores/appMode.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { Plus, BookOpen, ArrowDownCircle, ArrowUpCircle, X } from '@lucide/svelte';
	import { formatRupiah, formatDateTime } from '$lib/utils/format';
	import { toast } from 'svelte-sonner';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let entries = $state<any[]>([]);
	let loading = $state(true);

	// Simple mode quick-entry form state
	let showForm = $state<'masuk' | 'keluar' | null>(null);
	let formAmount = $state('');
	let formNote = $state('');
	let savingEntry = $state(false);

	onMount(async () => {
		await loadEntries();
	});

	async function loadEntries() {
		loading = true;
		try {
			const data = await apiClient(`/cashbook`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			if (data.success) entries = data.data;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function saveQuickEntry() {
		if (!formAmount || isNaN(Number(String(formAmount).replace(/\D/g, '')))) {
			toast.error('Masukkan jumlah yang valid');
			return;
		}
		savingEntry = true;
		try {
			const amount = Number(String(formAmount).replace(/\D/g, ''));
			const res = await apiClient('/cashbook', {
				method: 'POST',
				headers: { Authorization: `Bearer ${authState.token}` },
				body: JSON.stringify({
					type: showForm === 'masuk' ? 'in' : 'out',
					amount,
					description: formNote || (showForm === 'masuk' ? 'Uang masuk' : 'Uang keluar')
				})
			});
			if (res.success) {
				toast.success('Berhasil dicatat!');
				showForm = null;
				formAmount = '';
				formNote = '';
				await loadEntries();
			} else {
				toast.error(res.error?.message || 'Gagal menyimpan');
			}
		} catch (e: any) {
			toast.error(e.message || 'Gagal menyimpan');
		} finally {
			savingEntry = false;
		}
	}

	let saldo = $derived(
		entries.reduce((sum: number, e: any) => sum + (e.type === 'in' ? e.amount : -e.amount), 0)
	);
</script>

<svelte:head>
	<title>Buku Kas — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	{#if appModeState.mode === 'simple'}
		<!-- ===== MODE SEDERHANA ===== -->
		<div class="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
			<!-- Header -->
			<div class="flex items-center justify-between pt-2">
				<div>
					<p class="font-sans text-sm text-ink-soft">Hari ini</p>
					<h1 class="font-grotesk font-bold text-2xl text-ink">Kas Harian</h1>
				</div>
				<a href="/cashbook/new" class="w-10 h-10 rounded-full bg-brand flex items-center justify-center shadow-md hover:bg-brand-dark transition-colors">
					<Plus class="w-5 h-5 text-white" />
				</a>
			</div>

			<!-- Saldo card -->
			<div class="bg-paper border border-border rounded-2xl p-5 text-center shadow-sm">
				<p class="font-sans text-xs text-ink-soft mb-1">Saldo hari ini</p>
				{#if loading}
					<div class="h-9 w-32 bg-muted animate-pulse rounded-xl mx-auto"></div>
				{:else}
					<p class="font-grotesk font-extrabold text-3xl {saldo >= 0 ? 'text-success' : 'text-cta'}">
						{saldo >= 0 ? '' : '-'}{formatRupiah(Math.abs(saldo))}
					</p>
				{/if}
			</div>

			<!-- Two big action tiles -->
			<div class="grid grid-cols-2 gap-3">
				<button
					onclick={() => { showForm = showForm === 'masuk' ? null : 'masuk'; }}
					class="bg-success-soft border-none rounded-[18px] h-[88px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 {showForm === 'masuk' ? 'ring-2 ring-success' : ''}"
				>
					<ArrowDownCircle class="w-7 h-7 text-success" />
					<span class="font-grotesk font-bold text-sm text-ink">Uang Masuk</span>
				</button>
				<button
					onclick={() => { showForm = showForm === 'keluar' ? null : 'keluar'; }}
					class="bg-cta-soft border-none rounded-[18px] h-[88px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-95 {showForm === 'keluar' ? 'ring-2 ring-cta' : ''}"
				>
					<ArrowUpCircle class="w-7 h-7 text-cta" />
					<span class="font-grotesk font-bold text-sm text-ink">Uang Keluar</span>
				</button>
			</div>

			<!-- Inline quick-entry form -->
			{#if showForm}
				<div class="rounded-2xl p-4 transition-all {showForm === 'masuk' ? 'bg-success-soft' : 'bg-cta-soft'}">
					<div class="flex items-center justify-between mb-3">
						<span class="font-grotesk font-bold text-[13.5px] text-ink">
							Catat uang {showForm === 'masuk' ? 'masuk' : 'keluar'}
						</span>
						<button onclick={() => showForm = null} class="border-none bg-transparent cursor-pointer p-1">
							<X class="w-4 h-4 text-ink-soft" />
						</button>
					</div>
					<input
						type="number"
						inputmode="numeric"
						bind:value={formAmount}
						placeholder="Jumlah (Rp)"
						class="w-full border-none rounded-xl px-4 py-3 font-grotesk font-bold text-lg mb-2 bg-paper focus:outline-none focus:ring-2 {showForm === 'masuk' ? 'focus:ring-success' : 'focus:ring-cta'}"
					/>
					<input
						type="text"
						bind:value={formNote}
						placeholder="Keterangan singkat (opsional)"
						class="w-full border-none rounded-xl px-4 py-2.5 font-sans text-sm mb-3 bg-paper focus:outline-none focus:ring-2 {showForm === 'masuk' ? 'focus:ring-success' : 'focus:ring-cta'}"
					/>
					<button
						onclick={saveQuickEntry}
						disabled={savingEntry}
						class="w-full text-white border-none rounded-xl py-3 font-grotesk font-bold text-sm cursor-pointer transition-opacity disabled:opacity-60 {showForm === 'masuk' ? 'bg-success hover:bg-success/90' : 'bg-cta hover:bg-cta/90'}"
					>
						{savingEntry ? 'Menyimpan...' : 'Simpan'}
					</button>
				</div>
			{/if}

			<!-- Recent history list -->
			<div>
				<h2 class="font-grotesk font-bold text-[13.5px] text-ink mb-2">Riwayat hari ini</h2>
				{#if loading}
					<div class="flex flex-col gap-2">
						{#each [1,2,3] as _}
							<div class="h-14 bg-paper rounded-xl animate-pulse"></div>
						{/each}
					</div>
				{:else if entries.length === 0}
					<div class="text-center py-8 text-ink-soft">
						<BookOpen class="w-8 h-8 mx-auto mb-2 opacity-40" />
						<p class="text-sm">Belum ada catatan</p>
					</div>
				{:else}
					<div class="flex flex-col gap-2">
						{#each entries as entry}
							<div class="bg-paper border border-border rounded-xl px-4 py-2.5 flex items-center justify-between">
								<div>
									<p class="font-sans text-[13px] font-semibold text-ink">{entry.note || '-'}</p>
									<p class="font-sans text-[11px] text-ink-soft">{formatDateTime(entry.created_at)}</p>
								</div>
								<span class="font-grotesk font-bold text-[13.5px] {entry.type === 'in' ? 'text-success' : 'text-cta'}">
									{entry.type === 'in' ? '+' : '-'}{formatRupiah(entry.amount)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

	{:else}
		<!-- ===== MODE LENGKAP ===== -->
		<PageHeader title="Buku Kas" subtitle="Catatan Keuangan">
			{#snippet actions()}
				<Button
					href="/cashbook/new"
					size="sm"
					class="rounded-full bg-brand hover:bg-brand-dark text-white font-bold shadow-md hover:-translate-y-0.5 transition-all gap-1.5 h-10 px-4"
				>
					<Plus class="w-4 h-4" />
					<span class="hidden sm:inline">Catat Baru</span>
				</Button>
			{/snippet}
		</PageHeader>

		<main class="p-4 sm:p-6 max-w-4xl mx-auto w-full flex-1">
			<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden relative">
				<div class="absolute top-0 right-10 w-8 h-4 bg-surface rounded-b-full border-b border-l border-r border-border"></div>
				<Card.Content class="p-0">
					{#if loading}
						<LoadingSpinner message="Memuat data kas..." />
					{:else if entries.length === 0}
						<EmptyState
							icon={BookOpen}
							title="Belum Ada Catatan Kas"
							description="Mulai catat pemasukan dan pengeluaran toko Anda."
							actionHref="/cashbook/new"
							actionLabel="+ Catat Transaksi Pertama"
						/>
					{:else}
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header class="bg-paper-alt">
									<Table.Row class="hover:bg-transparent border-b-border">
										<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Tanggal</Table.Head>
										<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Keterangan</Table.Head>
										<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft text-right">Nominal</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each entries as entry}
										<Table.Row class="hover:bg-muted/40 border-b-border/60 transition-colors">
											<Table.Cell class="whitespace-nowrap text-ink-soft font-mono text-sm">
												{formatDateTime(entry.created_at)}
											</Table.Cell>
											<Table.Cell class="font-semibold text-ink">{entry.note || '-'}</Table.Cell>
											<Table.Cell
												class="text-right font-bold font-mono {entry.type === 'in'
													? 'text-success'
													: 'text-cta'}"
											>
												{entry.type === 'in' ? '+' : '-'}{formatRupiah(entry.amount)}
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</main>
	{/if}
</div>
