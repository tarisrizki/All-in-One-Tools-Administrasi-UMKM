<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, Plus, Trash2 } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let warehouses = $state<any[]>([]);
	let suppliers = $state<any[]>([]);
	let products = $state<any[]>([]);

	let loading = $state(true);
	let isSubmitting = $state(false);

	let po = $state({
		warehouse_id: '',
		supplier_id: '',
		expected_date: '',
		notes: '',
		items: [] as any[]
	});

	let selectedProductId = $state('');

	async function fetchData() {
		loading = true;
		try {
			const token = localStorage.getItem('umkm_token');
			const headers = { Authorization: `Bearer ${token}` };

			const [wRes, sRes, pRes] = await Promise.all([
				fetch(`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/warehouses`, { headers }),
				fetch(`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/suppliers`, { headers }),
				fetch(`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/products`, { headers })
			]);

			const [wJson, sJson, pJson] = await Promise.all([wRes.json(), sRes.json(), pRes.json()]);

			if (wJson.success) warehouses = wJson.data;
			if (sJson.success) suppliers = sJson.data;
			if (pJson.success) products = pJson.data;

			// Set default warehouse if available
			if (warehouses.length > 0) {
				const defaultW = warehouses.find((w) => w.is_default);
				po.warehouse_id = defaultW ? defaultW.id : warehouses[0].id;
			}
		} catch (err) {
			console.error(err);
			toast.error('Gagal mengambil data referensi');
		} finally {
			loading = false;
		}
	}

	function addProduct() {
		if (!selectedProductId) return;

		const p = products.find((x) => x.id === selectedProductId);
		if (!p) return;

		const existing = po.items.find((x) => x.product_id === p.id);
		if (existing) {
			existing.qty += 1;
		} else {
			po.items = [
				...po.items,
				{
					product_id: p.id,
					name: p.name,
					sku: p.sku || '-',
					qty: 1,
					cost_price: p.cost_price || 0
				}
			];
		}

		po.items = po.items; // trigger reactivity
		selectedProductId = ''; // reset selection
	}

	function removeItem(index: number) {
		po.items = po.items.filter((_, i) => i !== index);
	}

	let totalEstimate = $derived(po.items.reduce((sum, item) => sum + item.qty * item.cost_price, 0));

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	async function submitPo() {
		if (!po.supplier_id) {
			toast.error('Pilih pemasok (supplier) terlebih dahulu');
			return;
		}
		if (!po.warehouse_id) {
			toast.error('Pilih gudang tujuan');
			return;
		}
		if (po.items.length === 0) {
			toast.error('Tambahkan minimal 1 produk');
			return;
		}

		isSubmitting = true;
		try {
			const token = localStorage.getItem('umkm_token');
			const res = await fetch(
				`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/purchase-orders`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(po)
				}
			);
			const json = await res.json();
			if (json.success) {
				toast.success('PO berhasil dibuat');
				goto('/purchases');
			} else {
				toast.error(json.error.message);
			}
		} catch (err) {
			toast.error('Gagal membuat PO');
		} finally {
			isSubmitting = false;
		}
	}

	onMount(() => {
		fetchData();
	});
</script>

<svelte:head>
	<title>Buat PO Baru — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-24 font-sans flex flex-col">
	<PageHeader title="Buat Purchase Order Baru" subtitle="Pesan barang ke supplier untuk menambah stok gudang" backHref="/purchases" />

	{#if loading}
		<div class="flex justify-center p-12">
			<div
				class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else}
		<main class="p-4 sm:p-6 max-w-6xl mx-auto w-full flex-1">
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Informasi Umum -->
				<div class="lg:col-span-1">
					<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
						<Card.Header class="p-5 sm:p-6 border-b border-border/50">
							<Card.Title class="font-grotesk font-bold text-ink">Informasi Umum</Card.Title>
						</Card.Header>
						<Card.Content class="p-5 sm:p-6 space-y-4">
							<div class="space-y-2">
								<Label for="supplier" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Pemasok (Supplier) <span class="text-cta">*</span></Label>
								<select
									id="supplier"
									bind:value={po.supplier_id}
									class="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-paper-alt px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								>
								<option value="" disabled>-- Pilih Supplier --</option>
								{#each suppliers as sup}
									<option value={sup.id}>{sup.name}</option>
								{/each}
							</select>
								{#if suppliers.length === 0}
									<p class="text-[11px] text-warning-dark mt-1 font-mono">
										Belum ada supplier. <a href="/suppliers" class="text-brand underline font-bold"
											>Tambah di sini</a
										>.
									</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="warehouse" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Gudang Tujuan <span class="text-cta">*</span></Label>
								<select
									id="warehouse"
									bind:value={po.warehouse_id}
									class="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-paper-alt px-3 py-2 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#each warehouses as w}
										<option value={w.id}>{w.name}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-2">
								<Label for="expected_date" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Tanggal Estimasi Diterima</Label>
								<Input
									id="expected_date"
									type="date"
									bind:value={po.expected_date}
									class="h-12 rounded-xl border-border bg-paper-alt font-medium"
								/>
							</div>

							<div class="space-y-2">
								<Label for="notes" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Catatan Tambahan</Label>
								<Textarea
									id="notes"
									bind:value={po.notes}
									rows={3}
									placeholder="Opsional..."
									class="rounded-xl border-border bg-paper-alt font-medium"
								/>
							</div>
						</Card.Content>
				</Card.Root>
			</div>

			<!-- Daftar Produk -->
			<div class="lg:col-span-2">
				<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
					<Card.Header class="p-5 sm:p-6 border-b border-border/50">
						<Card.Title class="font-grotesk font-bold text-ink">Item Pesanan</Card.Title>
					</Card.Header>
					<Card.Content class="p-5 sm:p-6">
						<!-- Tambah Produk Bar -->
						<div class="flex gap-2 mb-6">
							<select
								bind:value={selectedProductId}
								class="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-paper-alt px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="" disabled>-- Cari atau Pilih Produk --</option>
								{#each products as p}
									<option value={p.id}>{p.name} (SKU: {p.sku || '-'})</option>
								{/each}
							</select>
							<Button
								onclick={addProduct}
								disabled={!selectedProductId}
								variant="outline"
								class="h-12 rounded-xl font-bold border-border"
							>
								Tambah
							</Button>
						</div>

						{#if po.items.length === 0}
							<div
								class="text-center py-10 bg-paper-alt border-2 border-dashed border-border/60 rounded-2xl text-ink-soft text-sm"
							>
								<p>Belum ada produk yang ditambahkan ke pesanan.</p>
							</div>
						{:else}
							<div class="overflow-x-auto rounded-2xl border border-border">
								<Table.Root>
									<Table.Header class="bg-paper-alt">
										<Table.Row class="border-b-border hover:bg-transparent">
											<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Produk</Table.Head>
											<Table.Head class="w-24 font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Jumlah</Table.Head>
											<Table.Head class="w-32 font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Harga Beli</Table.Head>
											<Table.Head class="w-32 text-right font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Subtotal</Table.Head>
											<Table.Head class="w-10"></Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each po.items as item, idx}
											<Table.Row class="border-b-border/60 hover:bg-muted/40">
												<Table.Cell>
													<div class="font-bold text-ink truncate max-w-[200px]">{item.name}</div>
													<div class="text-[11px] font-mono text-ink-faint">{item.sku}</div>
												</Table.Cell>
												<Table.Cell>
													<Input
														type="number"
														min="1"
														bind:value={item.qty}
														class="text-center h-9 px-2 rounded-lg border-border bg-paper-alt font-mono"
													/>
												</Table.Cell>
												<Table.Cell>
													<Input
														type="number"
														min="0"
														bind:value={item.cost_price}
														class="text-right h-9 px-2 rounded-lg border-border bg-paper-alt font-mono"
													/>
												</Table.Cell>
												<Table.Cell class="text-right font-bold font-mono text-ink">
													{formatRupiah(item.qty * item.cost_price)}
												</Table.Cell>
												<Table.Cell>
													<Button
														variant="ghost"
														size="icon"
														class="h-8 w-8 text-cta hover:text-cta hover:bg-cta-soft"
														onclick={() => removeItem(idx)}
													>
														<Trash2 class="h-4 w-4" />
													</Button>
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>

							<div class="mt-6 flex justify-end">
								<div class="bg-paper-alt border border-border rounded-2xl p-5 w-72 text-right">
									<div class="text-ink-faint text-[11px] uppercase font-mono mb-1 tracking-widest font-bold">Total Estimasi</div>
									<div class="text-2xl font-black font-mono text-ink">{formatRupiah(totalEstimate)}</div>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- Action Bar Floating (bottom) -->
		<div
			class="fixed bottom-0 left-0 right-0 lg:left-64 bg-paper/80 backdrop-blur-md border-t border-border p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-40"
		>
			<div class="max-w-6xl mx-auto flex justify-between items-center px-4">
				<Button variant="outline" href="/purchases" class="rounded-xl h-12 font-bold border-border">Batal</Button>
				<Button
					variant="cta"
					onclick={submitPo}
					disabled={isSubmitting || po.items.length === 0 || !po.supplier_id}
					size="lg"
					class="font-bold rounded-xl h-12 shadow-md hover:-translate-y-0.5 transition-all"
				>
					{#if isSubmitting}
						<div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></div>
						Memproses...
					{:else}
						Kirim Purchase Order (Draft)
					{/if}
				</Button>
			</div>
		</div>
	</main>
	{/if}
</div>
