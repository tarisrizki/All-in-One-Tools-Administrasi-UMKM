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
			const token = localStorage.getItem('token');
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
			const token = localStorage.getItem('token');
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
	<title>Buat PO Baru | UMKM Tools</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6 pb-24 p-4">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/purchases" class="rounded-full h-10 w-10">
			<ArrowLeft class="w-5 h-5" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold">Buat Purchase Order Baru</h1>
			<p class="text-muted-foreground text-sm mt-1">Pesan barang ke supplier untuk menambah stok gudang.</p>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center p-12">
			<div
				class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Informasi Umum -->
			<div class="lg:col-span-1">
				<Card.Root>
					<Card.Header>
						<Card.Title>Informasi Umum</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="supplier">Pemasok (Supplier) <span class="text-destructive">*</span></Label>
							<select
								id="supplier"
								bind:value={po.supplier_id}
								class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="" disabled>-- Pilih Supplier --</option>
								{#each suppliers as sup}
									<option value={sup.id}>{sup.name}</option>
								{/each}
							</select>
							{#if suppliers.length === 0}
								<p class="text-xs text-amber-500 mt-1">
									Belum ada supplier. <a href="/suppliers" class="text-primary underline"
										>Tambah di sini</a
									>.
								</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="warehouse">Gudang Tujuan <span class="text-destructive">*</span></Label>
							<select
								id="warehouse"
								bind:value={po.warehouse_id}
								class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#each warehouses as w}
									<option value={w.id}>{w.name}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2">
							<Label for="expected_date">Tanggal Estimasi Diterima</Label>
							<Input
								id="expected_date"
								type="date"
								bind:value={po.expected_date}
							/>
						</div>

						<div class="space-y-2">
							<Label for="notes">Catatan Tambahan</Label>
							<Textarea
								id="notes"
								bind:value={po.notes}
								rows={3}
								placeholder="Opsional..."
							/>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Daftar Produk -->
			<div class="lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Item Pesanan</Card.Title>
					</Card.Header>
					<Card.Content>
						<!-- Tambah Produk Bar -->
						<div class="flex gap-2 mb-6">
							<select
								bind:value={selectedProductId}
								class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="" disabled>-- Cari atau Pilih Produk --</option>
								{#each products as p}
									<option value={p.id}>{p.name} (SKU: {p.sku || '-'})</option>
								{/each}
							</select>
							<Button
								onclick={addProduct}
								disabled={!selectedProductId}
							>
								Tambah
							</Button>
						</div>

						{#if po.items.length === 0}
							<div
								class="text-center py-8 bg-muted/50 border border-dashed rounded-md text-muted-foreground"
							>
								<p class="text-sm">Belum ada produk yang ditambahkan ke pesanan.</p>
							</div>
						{:else}
							<div class="overflow-x-auto rounded-md border">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Produk</Table.Head>
											<Table.Head class="w-24">Jumlah</Table.Head>
											<Table.Head class="w-32">Harga Beli</Table.Head>
											<Table.Head class="w-32 text-right">Subtotal</Table.Head>
											<Table.Head class="w-10"></Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each po.items as item, idx}
											<Table.Row>
												<Table.Cell>
													<div class="font-bold truncate max-w-[200px]">{item.name}</div>
													<div class="text-xs text-muted-foreground">{item.sku}</div>
												</Table.Cell>
												<Table.Cell>
													<Input
														type="number"
														min="1"
														bind:value={item.qty}
														class="text-center h-8 px-2"
													/>
												</Table.Cell>
												<Table.Cell>
													<Input
														type="number"
														min="0"
														bind:value={item.cost_price}
														class="text-right h-8 px-2"
													/>
												</Table.Cell>
												<Table.Cell class="text-right font-bold">
													{formatRupiah(item.qty * item.cost_price)}
												</Table.Cell>
												<Table.Cell>
													<Button
														variant="ghost"
														size="icon"
														class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
								<div class="bg-muted/50 border rounded-md p-4 w-64 text-right">
									<div class="text-muted-foreground text-xs uppercase font-mono mb-1">Total Estimasi</div>
									<div class="text-2xl font-black">{formatRupiah(totalEstimate)}</div>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- Action Bar Floating (bottom) -->
		<div
			class="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-40"
		>
			<div class="max-w-6xl mx-auto flex justify-between items-center px-4">
				<Button variant="ghost" href="/purchases">Batal</Button>
				<Button
					onclick={submitPo}
					disabled={isSubmitting || po.items.length === 0 || !po.supplier_id}
					size="lg"
					class="font-bold"
				>
					{#if isSubmitting}
						<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
						Memproses...
					{:else}
						Kirim Purchase Order (Draft)
					{/if}
				</Button>
			</div>
		</div>
	{/if}
</div>
