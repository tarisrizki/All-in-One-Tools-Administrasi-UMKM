<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';

	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

	let debtId = $page.params.id;
	let debt = $state<any>(null);
	let loading = $state(true);
	let error = $state('');

	// Payment modal state
	let showPaymentModal = $state(false);
	let paymentAmount = $state('');
	let paymentMethod = $state('cash');
	let paymentNotes = $state('');
	let isSubmitting = $state(false);

	// Remind state
	let isReminding = $state(false);

	async function fetchDebt() {
		loading = true;
		try {
			const token = localStorage.getItem('token');
			const res = await fetch(`${API_URL}/v1/debts/${debtId}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const json = await res.json();
			if (json.success) {
				debt = json.data;
			} else {
				error = json.error.message;
			}
		} catch (err) {
			error = 'Gagal mengambil data';
		} finally {
			loading = false;
		}
	}

	async function submitPayment() {
		if (!paymentAmount || Number(paymentAmount) <= 0) return;

		isSubmitting = true;
		try {
			const token = localStorage.getItem('token');
			const res = await fetch(`${API_URL}/v1/debts/${debtId}/payments`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					amount: Number(paymentAmount),
					payment_method: paymentMethod,
					notes: paymentNotes
				})
			});
			const json = await res.json();
			if (json.success) {
				showPaymentModal = false;
				paymentAmount = '';
				paymentNotes = '';
				toast.success('Pembayaran berhasil dicatat');
				await fetchDebt();
			} else {
				toast.error(json.error.message);
			}
		} catch (err) {
			toast.error('Gagal mencatat pembayaran');
		} finally {
			isSubmitting = false;
		}
	}

	async function sendRemind() {
		isReminding = true;
		try {
			const token = localStorage.getItem('token');
			const res = await fetch(`${API_URL}/v1/debts/${debtId}/remind`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` }
			});
			const json = await res.json();
			if (json.success) {
				toast.success(json.message);
			} else {
				toast.error(json.error.message);
			}
		} catch (err) {
			toast.error('Gagal mengirim pengingat');
		} finally {
			isReminding = false;
		}
	}

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateStr: string) {
		return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(dateStr)
		);
	}

	function formatDateOnly(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(dateStr));
	}

	onMount(() => {
		fetchDebt();
	});
</script>

<svelte:head>
	<title>Detail Tagihan | UMKM Tools</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6 pb-20 p-4">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" class="rounded-full shrink-0" href="/debts">
			←
		</Button>
		<div>
			<h1 class="text-2xl font-bold">Detail Tagihan</h1>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center p-12">
			<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if error}
		<div class="bg-destructive/15 text-destructive p-4 rounded-md border border-destructive/20">
			{error}
		</div>
	{:else if debt}
		<!-- Ringkasan Kartu -->
		<Card.Root class="overflow-hidden">
			<div class="p-6 {debt.type === 'receivable' ? 'bg-primary/10' : 'bg-destructive/10'} border-b flex justify-between items-start">
				<div>
					<div class="text-xs font-bold {debt.type === 'receivable' ? 'text-primary' : 'text-destructive'} mb-1 uppercase tracking-wide">
						{debt.type === 'receivable' ? 'Piutang Pelanggan' : 'Hutang Supplier'}
					</div>
					<h2 class="text-2xl font-bold">{debt.entity_name}</h2>
					{#if debt.entity_phone}
						<div class="text-sm text-muted-foreground mt-1">{debt.entity_phone}</div>
					{/if}
				</div>
				<div>
					{#if debt.status === 'unpaid'}
						<Badge variant="destructive">BELUM LUNAS</Badge>
					{:else if debt.status === 'partial'}
						<Badge variant="outline" class="bg-amber-100 text-amber-700 hover:bg-amber-100 border-transparent">CICILAN</Badge>
					{:else if debt.status === 'paid'}
						<Badge class="bg-green-100 text-green-700 hover:bg-green-100">LUNAS</Badge>
					{/if}
				</div>
			</div>

			<Card.Content class="p-6 grid grid-cols-2 gap-6">
				<div>
					<div class="text-xs text-muted-foreground mb-1 uppercase font-mono">Total Tagihan</div>
					<div class="text-lg font-bold">{formatRupiah(debt.amount)}</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground mb-1 uppercase font-mono">Sisa Tagihan</div>
					<div class="text-2xl font-black {debt.status === 'paid' ? 'text-green-600' : 'text-destructive'}">
						{formatRupiah(debt.remaining_amount)}
					</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground mb-1 uppercase font-mono">Jatuh Tempo</div>
					<div class="text-sm font-medium">{formatDateOnly(debt.due_date)}</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground mb-1 uppercase font-mono">Catatan</div>
					<div class="text-sm">{debt.notes || '-'}</div>
				</div>
			</Card.Content>

			<div class="p-4 bg-muted/50 border-t flex gap-3 flex-col sm:flex-row">
				<Button
					onclick={() => (showPaymentModal = true)}
					disabled={debt.status === 'paid'}
					class="flex-1"
				>
					Catat Pembayaran
				</Button>
				<Button
					variant="outline"
					onclick={sendRemind}
					disabled={debt.status === 'paid' || !debt.entity_phone || isReminding}
					class="flex items-center gap-2"
				>
					<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12.031 0C5.389 0 0 5.39 0 12.031c0 2.115.55 4.184 1.597 6.002L.15 23.473l5.59-1.465A11.966 11.966 0 0012.03 24c6.643 0 12.032-5.39 12.032-12.032S18.674 0 12.03 0h.001zm0 22c-1.782 0-3.526-.479-5.056-1.385l-.36-.214-3.766.988.995-3.67-.235-.373A9.972 9.972 0 012.03 12.031C2.03 6.505 6.505 2 12.03 2s10 4.505 10 10-4.495 10-10 10zm5.498-7.513c-.3-.151-1.78-.88-2.056-.98-.277-.101-.478-.152-.68.151-.202.304-.78 1.002-.956 1.203-.176.202-.352.227-.654.076a8.214 8.214 0 01-2.417-1.495 9.07 9.07 0 01-1.676-2.078c-.176-.303-.019-.467.13-.618.136-.135.303-.353.455-.53.151-.176.202-.303.303-.504.101-.202.05-.38-.025-.531-.076-.151-.68-1.643-.933-2.25-.246-.593-.496-.512-.68-.52-.176-.008-.377-.01-.578-.01a1.11 1.11 0 00-.804.38c-.277.303-1.056 1.032-1.056 2.518 0 1.486 1.08 2.921 1.232 3.123.151.202 2.128 3.25 5.155 4.556 2.455 1.063 3.124.975 3.684.82 1.353-.377 2.383-.976 2.723-1.92.34-.945.34-1.753.24-1.92-.102-.168-.378-.269-.68-.42z"/>
					</svg>
					{#if isReminding}
						Mengirim...
					{:else}
						Kirim WA
					{/if}
				</Button>
			</div>
		</Card.Root>

		<!-- Riwayat Pembayaran -->
		<h3 class="font-bold text-lg mt-8 mb-4">Riwayat Pembayaran</h3>

		{#if debt.payments && debt.payments.length > 0}
			<Card.Root class="overflow-hidden">
				<Table.Root>
					<Table.Header class="bg-muted/50">
						<Table.Row>
							<Table.Head>Tanggal & Waktu</Table.Head>
							<Table.Head>Metode</Table.Head>
							<Table.Head>Nominal</Table.Head>
							<Table.Head>Catatan</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each debt.payments as pay}
							<Table.Row>
								<Table.Cell class="text-muted-foreground">{formatDate(pay.payment_date)}</Table.Cell>
								<Table.Cell class="uppercase text-xs font-bold">{pay.payment_method}</Table.Cell>
								<Table.Cell class="font-bold text-primary">{formatRupiah(pay.amount)}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{pay.notes || '-'}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Root>
		{:else}
			<div class="text-center py-8 bg-muted/20 border rounded-md border-dashed text-muted-foreground text-sm">
				Belum ada riwayat pembayaran untuk tagihan ini.
			</div>
		{/if}
	{/if}
</div>

<Dialog.Root bind:open={showPaymentModal}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Catat Pembayaran</Dialog.Title>
			<Dialog.Description>
				Masukkan detail pembayaran untuk tagihan ini.
			</Dialog.Description>
		</Dialog.Header>

		{#if debt}
			<div class="space-y-4 py-4">
				<div class="p-3 bg-amber-100 rounded-md border border-amber-200 mb-4">
					<div class="text-xs text-amber-800 uppercase font-bold mb-1">Sisa Tagihan Maksimal</div>
					<div class="text-lg font-black text-amber-900">{formatRupiah(debt.remaining_amount)}</div>
				</div>

				<div class="space-y-2">
					<Label for="paymentAmount">
						Nominal Pembayaran <span class="text-destructive">*</span>
					</Label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Rp</span>
						<Input
							id="paymentAmount"
							type="number"
							min="1"
							max={debt.remaining_amount}
							bind:value={paymentAmount}
							class="pl-10 font-bold"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="paymentMethod">Metode</Label>
					<Select.Root type="single" bind:value={paymentMethod}>
						<Select.Trigger class="w-full">
							{paymentMethod === 'cash' ? 'Tunai / Cash' : paymentMethod === 'transfer' ? 'Transfer Bank' : 'QRIS / e-Wallet'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="cash">Tunai / Cash</Select.Item>
							<Select.Item value="transfer">Transfer Bank</Select.Item>
							<Select.Item value="qris">QRIS / e-Wallet</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="paymentNotes">Catatan</Label>
					<Input
						id="paymentNotes"
						type="text"
						bind:value={paymentNotes}
						placeholder="Misal: Cicilan pertama..."
					/>
				</div>
			</div>
			
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showPaymentModal = false)}>
					Batal
				</Button>
				<Button
					onclick={submitPayment}
					disabled={isSubmitting || !paymentAmount}
				>
					{#if isSubmitting}
						<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
						Menyimpan...
					{:else}
						Simpan Pembayaran
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
