<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { PackageOpen, Plus } from 'lucide-svelte';
	import { animate, spring } from '@motionone/dom';

	// Motion One action
	function motion(node: HTMLElement, options: any) {
		const { initial, animate: anim, transition } = options;
		
		// Set initial state
		if (initial) {
			Object.assign(node.style, initial);
		}

		// Run animation
		if (anim) {
			animate(node, anim, transition);
		}

		return {
			update(newOptions: any) {
				if (newOptions.animate) {
					animate(node, newOptions.animate, newOptions.transition);
				}
			}
		};
	}

	let purchases = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Status update state
	let showStatusModal = $state(false);
	let selectedPo = $state<any>(null);
	let newStatus = $state('');
	let isSubmitting = $state(false);

	async function fetchPurchases() {
		loading = true;
		try {
			const token = localStorage.getItem('token');
			const res = await fetch(
				`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/purchase-orders`,
				{
					headers: { Authorization: `Bearer ${token}` }
				}
			);
			const json = await res.json();
			if (json.success) {
				purchases = json.data;
			} else {
				error = json.error.message;
			}
		} catch (err) {
			error = 'Gagal menghubungi server';
		} finally {
			loading = false;
		}
	}

	async function updateStatus() {
		if (!selectedPo || !newStatus) return;

		isSubmitting = true;
		try {
			const token = localStorage.getItem('token');
			const res = await fetch(
				`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/purchase-orders/${selectedPo.id}/status`,
				{
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ status: newStatus })
				}
			);
			const json = await res.json();
			if (json.success) {
				toast.success('Status berhasil diupdate');
				showStatusModal = false;
				await fetchPurchases();
			} else {
				toast.error(json.error.message);
			}
		} catch (err) {
			toast.error('Gagal mengupdate status PO');
		} finally {
			isSubmitting = false;
		}
	}

	function openStatusModal(po: any) {
		selectedPo = po;
		newStatus = po.status;
		showStatusModal = true;
	}

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateStr: string) {
		if (!dateStr) return '-';
		return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(dateStr));
	}

	onMount(() => {
		fetchPurchases();
	});
</script>

<svelte:head>
	<title>Pembelian (PO) | UMKM Tools</title>
</svelte:head>

<div 
	class="max-w-6xl mx-auto space-y-6 p-4"
	use:motion={{
		initial: { opacity: 0, transform: 'translateY(20px)' },
		animate: { opacity: 1, transform: 'translateY(0px)' },
		transition: { duration: 0.4, easing: 'ease-out' }
	}}
>
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Pembelian (PO)</h1>
			<p class="text-muted-foreground text-sm mt-1">Kelola pesanan pembelian barang ke supplier.</p>
		</div>
		<Button variant="cta" href="/purchases/new">
			<Plus class="w-4 h-4 mr-2" />
			Buat PO Baru
		</Button>
	</div>

	{#if loading}
		<div class="flex justify-center p-12">
			<div
				class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if error}
		<div 
			class="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20 font-medium"
			use:motion={{
				initial: { opacity: 0, transform: 'scale(0.95)' },
				animate: { opacity: 1, transform: 'scale(1)' },
				transition: { duration: 0.3 }
			}}
		>
			{error}
		</div>
	{:else if purchases.length === 0}
		<div
			use:motion={{
				initial: { opacity: 0, transform: 'translateY(20px)' },
				animate: { opacity: 1, transform: 'translateY(0px)' },
				transition: { duration: 0.4, delay: 0.1 }
			}}
		>
			<Card.Root class="text-center py-12">
				<Card.Content class="flex flex-col items-center justify-center">
					<div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
						<PackageOpen class="w-8 h-8 text-muted-foreground" />
					</div>
					<h3 class="text-lg font-bold mb-2">Belum Ada Pesanan Pembelian</h3>
					<p class="text-muted-foreground text-sm mb-6 max-w-sm">
						Buat Purchase Order (PO) untuk merekam transaksi pembelian barang dari supplier Anda.
					</p>
					<Button variant="cta" href="/purchases/new">
						<Plus class="w-4 h-4 mr-2" />
						Buat PO Baru
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	{:else}
		<Card.Root>
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>No. PO</Table.Head>
							<Table.Head>Tanggal</Table.Head>
							<Table.Head>Supplier</Table.Head>
							<Table.Head>Gudang Tujuan</Table.Head>
							<Table.Head>Total</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each purchases as po, index}
							<!-- Wait, Table.Row is a component too. But we can't wrap a tr with a div. We should just apply style or class if possible.
							 Actually, motion doesn't work on Table.Row. We can just skip motion for Table.Row or use it inside the cells. Let's just remove use:motion from Table.Row for now to fix build. -->
							<Table.Row>
								<Table.Cell class="font-bold">{po.po_number}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(po.created_at)}</Table.Cell>
								<Table.Cell>{po.supplier_name}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{po.warehouse_name}</Table.Cell>
								<Table.Cell class="font-bold">{formatRupiah(po.total_amount)}</Table.Cell>
								<Table.Cell>
									{#if po.status === 'draft'}
										<Badge variant="secondary">DRAFT</Badge>
									{:else if po.status === 'ordered'}
										<Badge variant="outline" class="text-info border-info bg-info-soft">DIPESAN</Badge>
									{:else if po.status === 'received'}
										<Badge class="bg-primary hover:bg-primary-dark text-white">DITERIMA</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => openStatusModal(po)}
										disabled={po.status === 'received'}
										class="text-primary font-medium"
									>
										Update Status
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Root>
	{/if}
</div>

<!-- Modal Update Status -->
<Dialog.Root bind:open={showStatusModal}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Update Status PO</Dialog.Title>
			<Dialog.Description>
				Ubah status untuk pesanan <strong class="text-foreground">{selectedPo?.po_number}</strong> dari <strong class="text-foreground">{selectedPo?.supplier_name}</strong>.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4 space-y-3">
			<!-- Option: Draft -->
			<label class="flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors {newStatus === 'draft' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}">
				<input
					type="radio"
					bind:group={newStatus}
					value="draft"
					class="mt-1"
				/>
				<div>
					<div class="font-bold text-sm">Draft</div>
					<div class="text-xs text-muted-foreground mt-1">Pesanan belum dikirim ke supplier</div>
				</div>
			</label>

			<!-- Option: Ordered -->
			<label class="flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors {newStatus === 'ordered' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}">
				<input
					type="radio"
					bind:group={newStatus}
					value="ordered"
					class="mt-1"
				/>
				<div>
					<div class="font-bold text-sm">Dipesan (Ordered)</div>
					<div class="text-xs text-muted-foreground mt-1">Pesanan sudah diteruskan ke supplier</div>
				</div>
			</label>

			<!-- Option: Received -->
			<label class="flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors {newStatus === 'received' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}">
				<input
					type="radio"
					bind:group={newStatus}
					value="received"
					class="mt-1"
				/>
				<div>
					<div class="font-bold text-sm">Diterima (Received)</div>
					<div class="text-xs text-muted-foreground mt-1">
						Barang sudah diterima, <strong class="text-warning">Stok gudang akan bertambah otomatis!</strong>
					</div>
				</div>
			</label>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showStatusModal = false)}>
				Batal
			</Button>
			<Button
				onclick={updateStatus}
				disabled={isSubmitting || newStatus === selectedPo?.status}
			>
				{#if isSubmitting}
					<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
					Menyimpan...
				{:else}
					Simpan Status
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
