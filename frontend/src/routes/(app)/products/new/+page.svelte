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
	import PageHeader from '$lib/components/PageHeader.svelte';

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

<svelte:head>
	<title>Tambah Produk — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Tambah Produk Baru" subtitle="Database Produk" backHref="/products" />

	<main class="p-4 sm:p-6 max-w-lg mx-auto w-full flex-1">
		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
			<Card.Content class="p-5 sm:p-6">
				<form onsubmit={handleSubmit} class="space-y-5">
					<div class="space-y-2">
						<Label for="name" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
							Nama Produk <span class="text-cta">*</span>
						</Label>
						<Input
							type="text"
							id="name"
							bind:value={name}
							required
							placeholder="Mis: Kopi Susu Aren"
							class="h-12 rounded-xl border-border bg-paper-alt font-medium"
						/>
					</div>

					<div class="space-y-2">
						<Label for="category" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Kategori</Label>
						<Select.Root
							type="single"
							bind:value={categoryId}
						>
							<Select.Trigger class="w-full h-12 rounded-xl border-border bg-paper-alt font-medium">
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
							<Label for="sellPrice" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
								Harga Jual <span class="text-cta">*</span>
							</Label>
							<div class="relative">
								<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint font-mono font-semibold">Rp</span>
								<Input
									type="number"
									id="sellPrice"
									bind:value={sellPrice}
									required
									class="pl-10 font-mono font-bold h-12 rounded-xl border-border bg-paper-alt"
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="costPrice" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Harga Modal</Label>
							<div class="relative">
								<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint font-mono font-semibold">Rp</span>
								<Input
									type="number"
									id="costPrice"
									bind:value={costPrice}
									class="pl-10 font-mono font-bold h-12 rounded-xl border-border bg-paper-alt"
								/>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="sku" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">SKU / Kode Barang</Label>
							<Input
								type="text"
								id="sku"
								bind:value={sku}
								placeholder="KSA-001"
								class="h-12 rounded-xl border-border bg-paper-alt font-medium"
							/>
						</div>
						<div class="space-y-2">
							<Label for="barcode" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Barcode</Label>
							<Input
								type="text"
								id="barcode"
								bind:value={barcode}
								placeholder="Scan/ketik..."
								class="h-12 rounded-xl border-border bg-paper-alt font-medium"
							/>
						</div>
					</div>

					<div class="pt-6 border-t border-border">
						<h3 class="text-[13px] font-bold font-grotesk text-ink mb-3">Pengaturan Stok (Opsional)</h3>
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="initialStock" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Stok Awal</Label>
								<Input
									type="number"
									id="initialStock"
									bind:value={initialStock}
									class="h-12 rounded-xl border-border bg-paper-alt font-mono font-bold"
								/>
							</div>
							<div class="space-y-2">
								<Label for="minStock" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Batas Minimum</Label>
								<Input
									type="number"
									id="minStock"
									bind:value={minStock}
									class="h-12 rounded-xl border-border bg-paper-alt font-mono font-bold"
								/>
							</div>
						</div>
					</div>

					<Button
						variant="cta"
						type="submit"
						disabled={loading}
						class="w-full mt-6 rounded-xl h-12 font-bold shadow-md hover:-translate-y-0.5 transition-all"
					>
						{#if loading}
							<div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></div>
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
