<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { syncState, triggerSync } from '$lib/stores/sync.svelte';
	import { db, type LocalProduct } from '$lib/db';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { Home, Search, ShoppingCart, Store } from '@lucide/svelte';
	import { v4 as uuidv4 } from 'uuid';

	import ProductGrid from '$lib/components/pos/ProductGrid.svelte';
	import SimpleProductGrid from '$lib/components/pos/SimpleProductGrid.svelte';
	import Cart from '$lib/components/pos/Cart.svelte';
	import PaymentModal from '$lib/components/pos/PaymentModal.svelte';
	import ReceiptModal from '$lib/components/pos/ReceiptModal.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { appModeState } from '$lib/stores/appMode.svelte';
	import { liveQuery } from 'dexie';

	let products = $state<LocalProduct[]>([]);
	let categories = $state<any[]>([]);
	let customersList = $state<any[]>([]);
	let loading = $state(true);

	let searchQuery = $state('');
	let selectedCategory = $state('all');

	let cart = $state<any[]>([]);
	let isCartOpen = $state(false);

	let isPaying = $state(false);
	let processingPayment = $state(false);
	
	let isReceiptOpen = $state(false);
	let lastTransactionId = $state('');
	let lastTransactionData = $state<any>(null);

	onMount(() => {
		// Fire async logic independently
		(async () => {
			try {
				if (syncState.isOnline) {
					triggerSync().then(() => loadLocalData());
				}
				await loadLocalData();
			} catch (e) {
				console.error('Failed to load local POS data', e);
			} finally {
				loading = false;
			}
		})();

		// Subscribe to changes in Dexie using liveQuery (optional, but good for reactivity if sync happens in bg)
		const observable = liveQuery(() => db.products.toArray());
		const subscription = observable.subscribe(result => {
			products = result;
		});

		const catObservable = liveQuery(() => db.categories.toArray());
		const catSub = catObservable.subscribe(res => {
			categories = res;
		});

		const custObservable = liveQuery(() => db.customers.toArray());
		const custSub = custObservable.subscribe(res => {
			customersList = res;
		});

		return () => {
			subscription.unsubscribe();
			catSub.unsubscribe();
			custSub.unsubscribe();
		};
	});

	async function loadLocalData() {
		products = await db.products.toArray();
		categories = await db.categories.toArray();
		customersList = await db.customers.toArray();
	}

	let filteredProducts = $derived(
		products.filter((p) => {
			const matchesSearch =
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(p.barcode && p.barcode.includes(searchQuery));
			const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
			return matchesSearch && matchesCat;
		})
	);

	let cartTotal = $derived(cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0));

	function addToCart(product: LocalProduct) {
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

	function updateCartQty(index: number, delta: number) {
		const item = cart[index];
		if (delta === 1 && item.qty >= item.stock) {
			toast.error('Stok tidak mencukupi!');
			return;
		}
		if (delta === -1 && item.qty === 1) {
			cart.splice(index, 1);
			return;
		}
		item.qty += delta;
	}

	async function submitPayment(payments: {method: string, amount: number}[], customerName?: string, customerPhone?: string, customerId?: string, redeemPoints?: number) {
		if (cart.length === 0) return;
		processingPayment = true;

		try {
			const clientTransactionId = uuidv4();
			const items = cart.map((i) => ({
				productId: i.id,
				name: i.name, // Added for receipt printer
				quantity: i.qty,
				unitPrice: Number(i.price),
				subtotal: Number(i.price) * i.qty
			}));

			const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

			// Always save to pending transactions first for safety and offline
			const pendingTx = {
				client_transaction_id: clientTransactionId,
				businessId: products[0]?.businessId || '', // Simplified, usually from auth context
				customerId: customerId || null,
				customerName: customerName || null,
				customerPhone: customerPhone || null,
				totalAmount: cartTotal,
				discount: 0,
				tax: 0,
				grandTotal: cartTotal,
				payments: payments, // Array of payments
				amountPaid: totalPaid,
				changeAmount: totalPaid - cartTotal,
				notes: null,
				createdAt: new Date().toISOString(),
				items,
				redeemPoints: redeemPoints || 0
			};

			await db.pending_transactions.add(pendingTx);

			// Decrease local stock immediately for snappiness
			await db.transaction('rw', db.products, async () => {
				for (const item of items) {
					const p = await db.products.get(item.productId);
					if (p) {
						p.stock -= item.quantity;
						await db.products.put(p);
					}
				}
			});

			toast.success(syncState.isOnline ? 'Transaksi Berhasil!' : 'Transaksi tersimpan offline!');
			cart = [];
			isPaying = false;
			
			lastTransactionId = clientTransactionId;
			lastTransactionData = pendingTx;
			isReceiptOpen = true;
			
			// Trigger sync if online
			if (syncState.isOnline) {
				triggerSync(); // Fire and forget
			}
		} catch (e) {
			console.error(e);
			toast.error('Gagal menyimpan transaksi');
		} finally {
			processingPayment = false;
		}
	}

	let syncingMarketplace = $state(false);
	async function syncTokopedia() {
		syncingMarketplace = true;
		try {
			const data = await apiClient(`/sync/marketplace/pull/tokopedia`, {
				method: 'POST'
			});
			if (!data.success) throw new Error(data.error?.message || 'Gagal sinkronisasi');
			
			toast.success(data.message);
			triggerSync(); // pull the new data to offline DB
		} catch (e: any) {
			toast.error(e.message || "Gagal menarik order dari Tokopedia");
		} finally {
			syncingMarketplace = false;
		}
	}
</script>

<div class="h-screen flex flex-col bg-surface font-sans">
	<!-- Header -->
	<header class="bg-paper px-4 py-3 border-b border-border flex gap-3 items-center shrink-0 shadow-sm z-20">
		<Button variant="ghost" size="icon" href="/dashboard" class="rounded-full hover:bg-muted text-ink-soft hover:text-ink">
			<Home class="w-5 h-5" />
		</Button>
		<div class="flex-1 relative">
			<Search class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
			<Input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari barang atau scan barcode..."
				class="w-full pl-11 h-12 rounded-full border-border bg-paper-alt shadow-sm focus-visible:ring-brand font-medium text-base"
			/>
		</div>
		<Button 
			variant="outline" 
			size="sm" 
			class="rounded-full hidden sm:flex items-center gap-2 font-bold" 
			onclick={syncTokopedia}
			disabled={syncingMarketplace}
		>
			<Store class="w-4 h-4" />
			{#if syncingMarketplace} Sinkronisasi... {:else} Sinkron Tokopedia {/if}
		</Button>
		<ThemeToggle />
	</header>

	<!-- Categories -->
	<div class="px-4 py-3 border-b border-border bg-paper flex gap-2 overflow-x-auto shrink-0 whitespace-nowrap hide-scrollbar shadow-sm z-10">
		<Button
			variant={selectedCategory === 'all' ? 'default' : 'outline'}
			size="sm"
			class="rounded-full px-5 font-bold transition-all {selectedCategory === 'all' ? 'bg-brand text-white shadow-md' : 'text-ink-soft border-border hover:border-brand hover:text-brand'}"
			onclick={() => (selectedCategory = 'all')}
		>
			Semua
		</Button>
		{#each categories as cat}
			<Button
				variant={selectedCategory === cat.id ? 'default' : 'outline'}
				size="sm"
				class="rounded-full px-5 font-bold transition-all {selectedCategory === cat.id ? 'bg-brand text-white shadow-md' : 'text-ink-soft border-border hover:border-brand hover:text-brand'}"
				onclick={() => (selectedCategory = cat.id)}
			>
				{cat.name}
			</Button>
		{/each}
	</div>

	<!-- Main POS Grid -->
	{#if appModeState.mode === 'simple'}
		<!-- ===== MODE SEDERHANA ===== -->
		<div class="flex-1 overflow-hidden flex flex-col">
			<SimpleProductGrid
				{loading}
				products={filteredProducts}
				{cart}
				onAddToCart={addToCart}
			/>
		</div>

		<!-- Simple Mode: Floating Cart Bar (always visible, dark pill) -->
		<div class="sticky bottom-0 z-40 p-4">
			<div class="bg-ink rounded-[18px] px-5 py-3.5 flex items-center justify-between shadow-[0_12px_32px_rgba(20,22,45,0.28)] transition-all duration-300 {cart.length === 0 ? 'opacity-60' : 'opacity-100'}">
				<div>
					<div class="text-[11px] text-white/60 font-sans mb-0.5">{cart.reduce((s, i) => s + i.qty, 0)} item dipilih</div>
					<div class="font-grotesk font-extrabold text-[18px] text-white tracking-tight">
						{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cartTotal)}
					</div>
				</div>
				<button
					onclick={() => { if (cart.length > 0) isPaying = true; }}
					class="bg-cta hover:bg-cta/90 text-white font-grotesk font-bold text-[14px] rounded-[12px] px-5 py-2.5 transition-all duration-200 disabled:opacity-40 border-none cursor-pointer"
					disabled={cart.length === 0}
				>
					Bayar →
				</button>
			</div>
		</div>
	{:else}
		<!-- ===== MODE LENGKAP ===== -->
		<div class="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
			<ProductGrid 
				{loading} 
				products={filteredProducts} 
				onAddToCart={addToCart} 
			/>

			<!-- Desktop Cart -->
			<div class="hidden lg:block h-full border-l border-border bg-paper w-[400px] xl:w-[440px] shrink-0 z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.02)]">
				<Cart 
					{cart} 
					{cartTotal} 
					onUpdateQty={updateCartQty}
					onClearCart={() => cart = []}
					onPayClick={() => isPaying = true}
				/>
			</div>
		</div>

		<!-- Mobile Sticky Bottom Bar -->
		{#if cart.length > 0}
			<div class="lg:hidden sticky bottom-0 z-40 bg-paper border-t border-border shadow-[0_-15px_30px_rgba(20,22,45,0.08)] p-4 flex justify-between items-center animate-in slide-in-from-bottom-5 rounded-t-3xl">
				<div class="flex flex-col">
					<span class="text-[10px] text-ink-soft font-bold uppercase tracking-widest font-mono">Total Pembayaran</span>
					<span class="text-xl font-black text-ink font-grotesk tracking-tight">
						{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cartTotal)}
					</span>
				</div>
				<Button variant="default" class="rounded-xl shadow-lg h-12 px-6 font-bold bg-brand hover:bg-brand-dark text-white gap-2 transition-transform hover:-translate-y-0.5" onclick={() => isCartOpen = true}>
					<ShoppingCart class="w-5 h-5" />
					({cart.length})
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!-- Mobile Cart Sheet -->
<Sheet.Root bind:open={isCartOpen}>
	<Sheet.Content side="bottom" class="h-[90vh] p-0 flex flex-col rounded-t-3xl border-none shadow-2xl">
		<Sheet.Header class="sr-only">
			<Sheet.Title>Keranjang Belanja</Sheet.Title>
			<Sheet.Description>Kelola pesanan Anda.</Sheet.Description>
		</Sheet.Header>
		<!-- Wrap Cart in a flex-1 container to fill the sheet -->
		<div class="flex-1 overflow-hidden flex flex-col rounded-t-3xl bg-card">
			<Cart 
				{cart} 
				{cartTotal} 
				onUpdateQty={updateCartQty}
				onClearCart={() => cart = []}
				onPayClick={() => {
					isCartOpen = false;
					isPaying = true;
				}}
			/>
		</div>
	</Sheet.Content>
</Sheet.Root>

<PaymentModal
	open={isPaying}
	cartTotal={cartTotal}
	customers={customersList}
	processingPayment={processingPayment}
	onClose={() => isPaying = false}
	onSubmit={submitPayment}
/>

<ReceiptModal
	open={isReceiptOpen}
	transactionId={lastTransactionId}
	transaction={lastTransactionData}
	onClose={() => isReceiptOpen = false}
	onNewTransaction={() => isReceiptOpen = false}
/>

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
