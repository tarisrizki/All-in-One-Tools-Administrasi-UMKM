<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Plus } from 'lucide-svelte';

	let entries = $state<any[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch(`${API_URL}/v1/cashbook`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				entries = data.data;
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateStr: string) {
		return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(dateStr)
		);
	}
</script>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center justify-between sticky top-0 z-10">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" href="/">
				<ArrowLeft class="w-5 h-5" />
			</Button>
			<h1 class="text-lg font-bold">Buku Kas</h1>
		</div>
		<Button variant="cta" href="/cashbook/new" size="sm">
			<Plus class="w-4 h-4 mr-2" />
			Transaksi
		</Button>
	</header>

	<main class="p-4 max-w-4xl mx-auto">
		<Card.Root>
			{#if loading}
				<div class="p-8 text-center text-muted-foreground">Memuat data...</div>
			{:else if entries.length === 0}
				<div class="p-8 text-center text-muted-foreground flex flex-col items-center">
					<p class="mb-4">Belum ada catatan kas.</p>
					<Button variant="cta" href="/cashbook/new">Catat Transaksi Pertama</Button>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Tanggal</Table.Head>
								<Table.Head>Keterangan</Table.Head>
								<Table.Head class="text-right">Nominal</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each entries as entry}
								<Table.Row>
									<Table.Cell class="whitespace-nowrap text-muted-foreground">
										{formatDate(entry.created_at)}
									</Table.Cell>
									<Table.Cell class="font-medium">{entry.description}</Table.Cell>
									<Table.Cell class="text-right font-bold {entry.type === 'in' ? 'text-primary' : 'text-destructive'}">
										{entry.type === 'in' ? '+' : '-'}{formatRupiah(entry.amount)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card.Root>
	</main>
</div>
