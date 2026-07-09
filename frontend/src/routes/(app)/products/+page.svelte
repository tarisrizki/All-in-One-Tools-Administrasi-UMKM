<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { Search, PackageOpen, Plus, Barcode, QrCode } from '@lucide/svelte';
	import { formatRupiah } from '$lib/utils/format';

	import { hasPermission } from '$lib/stores/auth.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let products = $state<any[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');

	let filteredProducts = $derived(
		products.filter(
			(p) =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	onMount(async () => {
		try {
			const res = await fetch(`${API_URL}/v1/products`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) products = data.data;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Stok Barang — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Stok Barang" subtitle="Katalog Produk Toko">
		{#snippet actions()}
			{#if hasPermission('products.write')}
				<Button
					href="/products/new"
					size="sm"
					class="rounded-full bg-brand hover:bg-brand-dark text-white font-bold shadow-md hover:-translate-y-0.5 transition-all gap-1.5 h-10 px-4"
				>
					<Plus class="w-4 h-4" />
					<span class="hidden sm:inline">Tambah Produk</span>
					<span class="sm:hidden">Tambah</span>
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<main class="p-4 sm:p-6 max-w-6xl mx-auto w-full flex-1">
		<div class="mb-6">
			<div class="relative w-full max-w-sm">
				<Search class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
				<Input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari nama atau SKU..."
					class="pl-11 h-12 rounded-2xl border-border bg-paper shadow-sm focus-visible:ring-brand font-medium"
				/>
			</div>
		</div>

		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden relative">
			<div class="absolute top-0 right-10 w-8 h-4 bg-surface rounded-b-full border-b border-l border-r border-border"></div>

			<Card.Content class="p-0">
				{#if loading}
					<LoadingSpinner message="Memuat data stok..." />
				{:else if filteredProducts.length === 0}
					<EmptyState
						icon={PackageOpen}
						title={searchQuery ? 'Produk tidak ditemukan' : 'Belum ada produk'}
						description={searchQuery
							? `Tidak ada barang yang cocok dengan pencarian "${searchQuery}".`
							: 'Tambahkan produk pertama untuk mulai berjualan dan mengelola stok.'}
						actionHref={!searchQuery ? '/products/new' : undefined}
						actionLabel={!searchQuery ? '+ Tambah Produk' : undefined}
					/>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header class="bg-paper-alt">
								<Table.Row class="hover:bg-transparent border-b-border">
									<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Barang</Table.Head>
									<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft text-right">Harga Jual</Table.Head>
									<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft text-right">Stok</Table.Head>
									<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredProducts as p}
									<Table.Row class="hover:bg-muted/40 border-b-border/60 transition-colors">
										<Table.Cell class="py-4">
											<div class="font-bold text-ink text-[14px]">{p.name}</div>
											<div class="text-[11px] font-mono text-ink-soft mt-0.5">
												SKU: {p.sku || '-'}
												{#if p.stock <= p.min_stock}
													<Badge
														variant="outline"
														class="ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold bg-warning-soft text-warning border-transparent"
														>Menipis</Badge
													>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell class="text-right text-ink font-mono font-bold tracking-tight">
											{formatRupiah(p.sell_price)}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div
												class="inline-flex items-center justify-center font-mono font-bold text-sm min-w-[2.5rem] px-2 py-1 rounded-lg
													{p.stock === 0
													? 'bg-cta-soft text-cta'
													: p.stock <= p.min_stock
														? 'bg-warning-soft text-warning'
														: 'bg-paper-alt border border-border text-ink'}"
											>
												{p.stock}
											</div>
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1.5">
												<Button
													variant="outline"
													size="icon"
													class="h-8 w-8 rounded-lg text-ink-soft hover:text-brand border-border bg-paper shadow-sm hover:shadow"
													onclick={() => window.open(`${API_URL}/v1/products/${p.id}/barcode`, '_blank')}
													aria-label="Barcode"
												>
													<Barcode class="w-4 h-4" />
												</Button>
												<Button
													variant="outline"
													size="icon"
													class="h-8 w-8 rounded-lg text-ink-soft hover:text-brand border-border bg-paper shadow-sm hover:shadow"
													onclick={() => window.open(`${API_URL}/v1/products/${p.id}/qrcode`, '_blank')}
													aria-label="QR Code"
												>
													<QrCode class="w-4 h-4" />
												</Button>
											</div>
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
