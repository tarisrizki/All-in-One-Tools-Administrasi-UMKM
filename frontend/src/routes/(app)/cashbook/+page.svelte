<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { Plus, BookOpen } from '@lucide/svelte';
	import { formatRupiah, formatDateTime } from '$lib/utils/format';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let entries = $state<any[]>([]);
	let loading = $state(true);

	onMount(async () => {
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
	});
</script>

<svelte:head>
	<title>Buku Kas — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
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
										<Table.Cell class="font-semibold text-ink">{entry.description}</Table.Cell>
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
</div>
