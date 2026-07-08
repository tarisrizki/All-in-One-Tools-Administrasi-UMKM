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

	let products = $state<any[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch(`${API_URL}/v1/products`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				products = data.data;
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
</script>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center gap-3">
		<Button variant="ghost" size="icon" href="/">
			←
		</Button>
		<h1 class="text-lg font-bold">Stok Barang</h1>
	</header>

	<main class="p-4 max-w-5xl mx-auto">
		<div class="flex justify-between items-center mb-4 gap-2">
			<Input
				type="text"
				placeholder="Cari barang..."
				class="max-w-xs"
			/>
			<Button href="/products/new" size="sm">
				+ Tambah
			</Button>
		</div>

		<Card.Root>
			<Card.Content class="p-0">
				{#if loading}
					<div class="p-8 text-center text-muted-foreground flex justify-center">
						<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
					</div>
				{:else if products.length === 0}
					<div class="p-8 text-center text-muted-foreground flex flex-col items-center">
						<p>Belum ada produk.</p>
						<Button variant="link" href="/products/new" class="mt-2">
							Tambah Produk Pertama
						</Button>
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Nama Barang</Table.Head>
								<Table.Head>Harga Jual</Table.Head>
								<Table.Head class="text-right">Stok</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each products as p}
								<Table.Row>
									<Table.Cell class="font-medium">
										{p.name}
										{#if p.stock <= p.min_stock}
											<Badge variant="destructive" class="ml-2 text-[10px]">Stok Menipis</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-muted-foreground">{formatRupiah(p.sell_price)}</Table.Cell>
									<Table.Cell class="text-right font-bold {p.stock === 0 ? 'text-destructive' : ''}">
										{p.stock}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</main>
</div>
