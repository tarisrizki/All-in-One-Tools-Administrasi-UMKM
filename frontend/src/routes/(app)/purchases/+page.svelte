<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { authState } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { PackageOpen, Plus } from '@lucide/svelte';
	import { formatRupiah, formatDate } from '$lib/utils/format';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';


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
			const token = localStorage.getItem('umkm_token');
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
			const token = localStorage.getItem('umkm_token');
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


	onMount(() => {
		fetchPurchases();
	});
</script>

<svelte:head>
	<title>Pembelian (PO) — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Pembelian (PO)" subtitle="Pesanan ke Supplier">
		{#snippet actions()}
			<Button
				href="/purchases/new"
				size="sm"
				class="rounded-full bg-brand hover:bg-brand-dark text-white font-bold shadow-md hover:-translate-y-0.5 transition-all gap-1.5 h-10 px-4"
			>
				<Plus class="w-4 h-4" /> Buat PO Baru
			</Button>
		{/snippet}
	</PageHeader>

	<main class="p-4 sm:p-6 max-w-6xl mx-auto w-full flex-1">

	{#if loading}
		<div class="flex justify-center p-12">
			<LoadingSpinner />
		</div>
	{:else if error}
		<div class="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20 font-medium">
			{error}
		</div>
		<div>
			<Card.Root class="text-center py-16 bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
				<Card.Content class="flex flex-col items-center justify-center p-6">
					<div class="w-20 h-20 bg-paper-alt rounded-full flex items-center justify-center mb-6">
						<PackageOpen class="w-10 h-10 text-ink-faint" />
					</div>
					<h3 class="text-xl font-bold mb-2 font-grotesk text-ink">Belum Ada Pesanan Pembelian</h3>
					<p class="text-ink-soft text-sm mb-8 max-w-sm">
						Buat Purchase Order (PO) untuk merekam transaksi pembelian barang dari supplier Anda.
					</p>
					<Button variant="cta" href="/purchases/new" class="rounded-xl h-12 font-bold px-6 shadow-md hover:-translate-y-0.5 transition-all">
						<Plus class="w-4 h-4 mr-2" />
						Buat PO Baru
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	{:else}
		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header class="bg-paper-alt">
						<Table.Row class="border-b-border hover:bg-transparent">
							<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">No. PO</Table.Head>
							<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Tanggal</Table.Head>
							<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Supplier</Table.Head>
							<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Gudang Tujuan</Table.Head>
							<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Total</Table.Head>
							<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Status</Table.Head>
							<Table.Head class="text-right font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each purchases as po, index}
							<Table.Row class="border-b-border/60 hover:bg-muted/40">
								<Table.Cell class="font-bold font-mono text-brand">{po.po_number}</Table.Cell>
								<Table.Cell class="text-ink-soft font-mono text-[13px]">{formatDate(po.created_at)}</Table.Cell>
								<Table.Cell class="font-bold text-ink">{po.supplier_name}</Table.Cell>
								<Table.Cell class="text-ink-soft font-medium text-[13px]">{po.warehouse_name}</Table.Cell>
								<Table.Cell class="font-bold font-mono text-ink">{formatRupiah(po.total_amount)}</Table.Cell>
								<Table.Cell>
									{#if po.status === 'draft'}
										<Badge variant="secondary" class="bg-paper-alt text-ink-soft font-mono text-[10px] tracking-wider border-border/60 font-bold">DRAFT</Badge>
									{:else if po.status === 'ordered'}
										<Badge variant="outline" class="text-info font-mono text-[10px] tracking-wider border-info bg-info-soft font-bold">DIPESAN</Badge>
									{:else if po.status === 'received'}
										<Badge class="bg-success hover:bg-success-dark text-white font-mono text-[10px] tracking-wider font-bold">DITERIMA</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => openStatusModal(po)}
										disabled={po.status === 'received'}
										class="text-cta font-bold hover:bg-cta-soft hover:text-cta h-8 rounded-lg"
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
	</main>
</div>

<!-- Modal Update Status -->
<Dialog.Root bind:open={showStatusModal}>
	<Dialog.Content class="sm:max-w-[425px] bg-paper border-border rounded-3xl p-6 sm:p-8">
		<Dialog.Header class="mb-4">
			<Dialog.Title class="font-grotesk font-bold text-ink text-xl">Update Status PO</Dialog.Title>
			<Dialog.Description class="text-ink-soft">
				Ubah status untuk pesanan <strong class="text-ink font-mono bg-paper-alt px-1.5 py-0.5 rounded text-[13px]">{selectedPo?.po_number}</strong> dari <strong class="text-ink">{selectedPo?.supplier_name}</strong>.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-2 space-y-3">
			<!-- Option: Draft -->
			<label class="flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-colors {newStatus === 'draft' ? 'border-brand bg-brand-soft/30' : 'border-border bg-paper-alt hover:bg-muted/40'}">
				<input
					type="radio"
					bind:group={newStatus}
					value="draft"
					class="mt-1 accent-brand w-4 h-4"
				/>
				<div>
					<div class="font-bold text-ink">Draft</div>
					<div class="text-sm text-ink-soft mt-0.5">Pesanan belum dikirim ke supplier</div>
				</div>
			</label>

			<!-- Option: Ordered -->
			<label class="flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-colors {newStatus === 'ordered' ? 'border-brand bg-brand-soft/30' : 'border-border bg-paper-alt hover:bg-muted/40'}">
				<input
					type="radio"
					bind:group={newStatus}
					value="ordered"
					class="mt-1 accent-brand w-4 h-4"
				/>
				<div>
					<div class="font-bold text-ink">Dipesan (Ordered)</div>
					<div class="text-sm text-ink-soft mt-0.5">Pesanan sudah diteruskan ke supplier</div>
				</div>
			</label>

			<!-- Option: Received -->
			<label class="flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-colors {newStatus === 'received' ? 'border-brand bg-brand-soft/30' : 'border-border bg-paper-alt hover:bg-muted/40'}">
				<input
					type="radio"
					bind:group={newStatus}
					value="received"
					class="mt-1 accent-brand w-4 h-4"
				/>
				<div>
					<div class="font-bold text-ink">Diterima (Received)</div>
					<div class="text-sm text-ink-soft mt-0.5">
						Barang sudah diterima, <strong class="text-warning-dark">Stok gudang akan bertambah otomatis!</strong>
					</div>
				</div>
			</label>
		</div>

		<Dialog.Footer class="mt-6 gap-2 sm:gap-0">
			<Button variant="outline" class="rounded-xl h-12 font-bold border-border" onclick={() => (showStatusModal = false)}>
				Batal
			</Button>
			<Button
				variant="cta"
				onclick={updateStatus}
				disabled={isSubmitting || newStatus === selectedPo?.status}
				class="rounded-xl h-12 font-bold"
			>
				{#if isSubmitting}
					<div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></div>
					Menyimpan...
				{:else}
					Simpan Status
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
