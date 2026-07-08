<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Plus, Minus, Home, Search, ShoppingCart, Trash2 } from 'lucide-svelte';

	let products = $state<any[]>([]);
	let categories = $state<any[]>([]);
	let loading = $state(true);

	let searchQuery = $state('');
	let selectedCategory = $state('all');

	let cart = $state<any[]>([]);

	let isPaying = $state(false);
	let payAmount = $state('');
	let processingPayment = $state(false);

	onMount(async () => {
		try {
			const [prodRes, catRes] = await Promise.all([
				fetch(`${API_URL}/v1/products`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				}),
				fetch(`${API_URL}/v1/categories`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				})
			]);

			const prodData = await prodRes.json();
			const catData = await catRes.json();

			if (prodData.success) products = prodData.data;
			if (catData.success) categories = catData.data;
		} catch (e) {
			console.error('Failed to load POS data', e);
		} finally {
			loading = false;
		}
	});

	let filteredProducts = $derived(
		products.filter((p) => {
			const matchesSearch =
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(p.barcode && p.barcode.includes(searchQuery));
			const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
			return matchesSearch && matchesCat;
		})
	);

	let cartTotal = $derived(cart.reduce((sum, item) => sum + item.sell_price * item.qty, 0));

	function addToCart(product: any) {
		const existing = cart.find((i) => i.id === product.id);
		if (existing) {
			if (existing.qty < product.stock) {
				existing.qty += 1;
			} else {
				toast.error('Stok tidak mencukupi!');
			}
		} else {
			if (product.stock > 0) {
				cart.push({ ...product, qty: 1 });
			} else {
				toast.error('Stok habis!');
			}
		}
	}

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	async function submitPayment() {
		if (cart.length === 0) return;
		processingPayment = true;

		try {
			const res = await fetch(`${API_URL}/v1/sales`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					items: cart.map((i) => ({
						productId: i.id,
						qty: i.qty,
						price: Number(i.sell_price),
						discount: 0
					})),
					payments: [
						{
							method: 'cash',
							amount: Number(payAmount) || cartTotal
						}
					]
				})
			});

			const data = await res.json();
			if (data.success) {
				toast.success('Transaksi Berhasil!');
				cart = [];
				isPaying = false;
				payAmount = '';
				// Reload stock
				const prodRes = await fetch(`${API_URL}/v1/products`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				});
				const prodData = await prodRes.json();
				if (prodData.success) products = prodData.data;
			} else {
				toast.error('Gagal: ' + data.error.message);
			}
		} catch (e) {
			toast.error('Terjadi kesalahan jaringan');
		} finally {
			processingPayment = false;
		}
	}
</script>

<div class="h-screen flex flex-col bg-background">
	<!-- Header -->
	<header class="bg-card px-4 py-3 border-b flex gap-3 items-center shrink-0">
		<Button variant="ghost" size="icon" href="/">
			<Home class="w-5 h-5" />
		</Button>
		<div class="flex-1 relative">
			<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari barang atau scan barcode..."
				class="w-full pl-9"
			/>
		</div>
	</header>

	<!-- Categories -->
	<div class="px-4 py-2 border-b bg-card flex gap-2 overflow-x-auto shrink-0 whitespace-nowrap hide-scrollbar">
		<Button
			variant={selectedCategory === 'all' ? 'default' : 'outline'}
			size="sm"
			class="rounded-full"
			onclick={() => (selectedCategory = 'all')}
		>
			Semua
		</Button>
		{#each categories as cat}
			<Button
				variant={selectedCategory === cat.id ? 'default' : 'outline'}
				size="sm"
				class="rounded-full"
				onclick={() => (selectedCategory = cat.id)}
			>
				{cat.name}
			</Button>
		{/each}
	</div>

	<!-- Main POS Grid -->
	<div class="flex-1 overflow-hidden flex flex-col lg:flex-row">
		<!-- Product List -->
		<ScrollArea class="flex-1 p-4 bg-muted/20">
			{#if loading}
				<div class="text-center py-10 text-muted-foreground">Memuat produk...</div>
			{:else if filteredProducts.length === 0}
				<div class="text-center py-10 text-muted-foreground">Tidak ada produk ditemukan.</div>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-24 lg:pb-0">
					{#each filteredProducts as product}
						<Button
							variant="outline"
							class="h-auto p-3 flex flex-col items-start text-left gap-2 hover:border-primary whitespace-normal"
							onclick={() => addToCart(product)}
						>
							<div class="font-bold text-sm line-clamp-2 min-h-[2.5rem] w-full">
								{product.name}
							</div>
							<div class="w-full">
								<div class="text-primary font-bold text-sm">{formatRupiah(product.sell_price)}</div>
								<div class="text-xs text-muted-foreground mt-1">Stok: {product.stock}</div>
							</div>
						</Button>
					{/each}
				</div>
			{/if}
		</ScrollArea>

		<!-- Cart Sidebar (Mobile Bottom Sheet / Desktop Sidebar) -->
		{#if cart.length > 0}
			<aside class="bg-card border-t lg:border-t-0 lg:border-l w-full lg:w-[400px] flex flex-col shrink-0 h-[45vh] lg:h-auto shadow-[0_-4px_10px_rgba(0,0,0,0.05)] lg:shadow-none z-10">
				<div class="p-4 border-b font-bold flex justify-between items-center bg-card">
					<div class="flex items-center gap-2">
						<ShoppingCart class="w-5 h-5" />
						<span>Keranjang ({cart.length})</span>
					</div>
					<Button variant="ghost" size="sm" class="text-destructive hover:text-destructive hover:bg-destructive/10" onclick={() => (cart = [])}>
						<Trash2 class="w-4 h-4 mr-2" />
						Kosongkan
					</Button>
				</div>

				<ScrollArea class="flex-1 p-4">
					<div class="space-y-4 pr-3">
						{#each cart as item, i}
							<div class="flex justify-between items-center gap-2">
								<div class="flex-1 min-w-0">
									<div class="font-medium text-sm truncate" title={item.name}>{item.name}</div>
									<div class="text-primary font-medium text-sm">{formatRupiah(item.sell_price)}</div>
								</div>
								<div class="flex items-center gap-2 bg-muted rounded-md p-1">
									<Button
										variant="ghost"
										size="icon"
										class="w-8 h-8 rounded-sm hover:bg-background"
										onclick={() => {
											if (item.qty > 1) item.qty--;
											else cart.splice(i, 1);
										}}
									>
										<Minus class="w-3 h-3" />
									</Button>
									<span class="font-bold text-sm w-6 text-center">{item.qty}</span>
									<Button
										variant="ghost"
										size="icon"
										class="w-8 h-8 rounded-sm hover:bg-background"
										onclick={() => addToCart(item)}
									>
										<Plus class="w-3 h-3" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</ScrollArea>

				<div class="p-4 border-t bg-card">
					<div class="flex justify-between items-center mb-4">
						<span class="text-muted-foreground font-medium">Total Tagihan</span>
						<span class="text-2xl font-bold text-primary">{formatRupiah(cartTotal)}</span>
					</div>
					<Button
						variant="cta"
						size="lg"
						class="w-full font-bold text-lg h-14"
						onclick={() => (isPaying = true)}
					>
						Bayar Sekarang
					</Button>
				</div>
			</aside>
		{/if}
	</div>
</div>

<Dialog.Root bind:open={isPaying}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Pembayaran</Dialog.Title>
			<Dialog.Description>
				Selesaikan transaksi untuk pesanan ini.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-6">
			<div class="text-center mb-8">
				<p class="text-sm text-muted-foreground mb-1 font-medium">Total Tagihan</p>
				<p class="text-4xl font-bold text-primary">{formatRupiah(cartTotal)}</p>
			</div>

			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="payAmount">Uang Diterima (Tunai)</Label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Rp</span>
						<Input
							id="payAmount"
							type="number"
							bind:value={payAmount}
							placeholder={cartTotal.toString()}
							class="pl-10 text-lg font-bold h-12"
						/>
					</div>
				</div>
				
				<div class="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
					{#each [cartTotal, 50000, 100000, 150000, 200000] as suggestion}
						{#if suggestion >= cartTotal}
							<Button
								variant="outline"
								size="sm"
								class="shrink-0"
								onclick={() => (payAmount = suggestion.toString())}
							>
								{formatRupiah(suggestion)}
							</Button>
						{/if}
					{/each}
				</div>
			</div>
		</div>
		
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (isPaying = false)} class="w-full sm:w-auto">
				Batal
			</Button>
			<Button
				onclick={submitPayment}
				disabled={processingPayment}
				class="w-full sm:w-auto"
			>
				{#if processingPayment}
					<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
					Memproses...
				{:else}
					Selesaikan Transaksi
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
