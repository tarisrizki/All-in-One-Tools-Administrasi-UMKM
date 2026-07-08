<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';

	let categories = $state<any[]>([]);

	// Form data
	let name = $state('');
	let categoryId = $state('');
	let sku = $state('');
	let barcode = $state('');
	let costPrice = $state('');
	let sellPrice = $state('');
	let initialStock = $state('0');
	let minStock = $state('5');

	let loading = $state(false);

	onMount(async () => {
		try {
			const res = await fetch(`${API_URL}/v1/categories`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				categories = data.data;
				if (categories.length > 0) {
					categoryId = categories[0].id;
				}
			}
		} catch (e) {
			console.error(e);
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;

		try {
			const res = await fetch(`${API_URL}/v1/products`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name,
					categoryId: categoryId || null,
					sku: sku || undefined,
					barcode: barcode || undefined,
					costPrice: Number(costPrice) || 0,
					sellPrice: Number(sellPrice) || 0,
					initialStock: Number(initialStock) || 0,
					minStock: Number(minStock) || 5
				})
			});

			const result = await res.json();

			if (result.success) {
				toast.success('Produk berhasil disimpan');
				goto('/products');
			} else {
				toast.error(result.error?.message || 'Gagal menyimpan produk');
			}
		} catch (err) {
			toast.error('Koneksi ke server gagal');
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
		<Button variant="ghost" size="icon" href="/products">
			←
		</Button>
		<h1 class="text-lg font-bold">Tambah Produk Baru</h1>
	</header>

	<main class="p-4 max-w-lg mx-auto mt-2">
		<Card.Root>
			<Card.Content class="p-5">
				<form onsubmit={handleSubmit} class="space-y-5">
					<div class="space-y-2">
						<Label for="name">
							Nama Produk <span class="text-destructive">*</span>
						</Label>
						<Input
							type="text"
							id="name"
							bind:value={name}
							required
							placeholder="Mis: Kopi Susu Aren"
						/>
					</div>

					<div class="space-y-2">
						<Label for="category">Kategori</Label>
						<Select.Root
							type="single"
							bind:value={categoryId}
						>
							<Select.Trigger class="w-full">
								{#if categoryId}
									{categories.find((c) => c.id === categoryId)?.name || 'Pilih Kategori...'}
								{:else}
									Pilih Kategori...
								{/if}
							</Select.Trigger>
							<Select.Content>
								{#each categories as cat}
									<Select.Item value={cat.id}>{cat.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="sellPrice">
								Harga Jual <span class="text-destructive">*</span>
							</Label>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
								<Input
									type="number"
									id="sellPrice"
									bind:value={sellPrice}
									required
									class="pl-9"
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="costPrice">Harga Modal</Label>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
								<Input
									type="number"
									id="costPrice"
									bind:value={costPrice}
									class="pl-9"
								/>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="sku">SKU / Kode Barang</Label>
							<Input
								type="text"
								id="sku"
								bind:value={sku}
								placeholder="KSA-001"
							/>
						</div>
						<div class="space-y-2">
							<Label for="barcode">Barcode</Label>
							<Input
								type="text"
								id="barcode"
								bind:value={barcode}
								placeholder="Scan/ketik..."
							/>
						</div>
					</div>

					<div class="pt-4 border-t">
						<h3 class="text-sm font-bold mb-3">Pengaturan Stok (Opsional)</h3>
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="initialStock">Stok Awal</Label>
								<Input
									type="number"
									id="initialStock"
									bind:value={initialStock}
								/>
							</div>
							<div class="space-y-2">
								<Label for="minStock">Batas Minimum</Label>
								<Input
									type="number"
									id="minStock"
									bind:value={minStock}
								/>
							</div>
						</div>
					</div>

					<Button
						variant="cta"
						type="submit"
						disabled={loading}
						class="w-full mt-6"
					>
						{#if loading}
							<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
							Menyimpan...
						{:else}
							Simpan Produk
						{/if}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	</main>
</div>
