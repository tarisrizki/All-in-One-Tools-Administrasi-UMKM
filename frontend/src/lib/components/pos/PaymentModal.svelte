<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { formatRupiah } from '$lib/utils/format';
	import { Trash2 } from '@lucide/svelte';
	import { env } from '$env/dynamic/public';
	import { authState } from '$lib/stores/auth.svelte';
	import { v4 as uuidv4 } from 'uuid';

	let {
		open,
		cartTotal,
		customers = [],
		processingPayment,
		onClose,
		onSubmit
	}: {
		open: boolean;
		cartTotal: number;
		customers?: any[];
		processingPayment: boolean;
		onClose: () => void;
		onSubmit: (
			payments: { method: string; amount: number }[],
			customerName?: string,
			customerPhone?: string,
			customerId?: string,
			redeemPoints?: number
		) => void;
	} = $props();

	const PAYMENT_METHODS = [
		{ value: 'cash', label: 'Tunai' },
		{ value: 'qris', label: 'QRIS' },
		{ value: 'transfer', label: 'Transfer Bank' },
		{ value: 'credit', label: 'Tempo / Kasbon' }
	];

	let payments = $state([{ method: 'cash', amount: '' as string | number }]);
	let customerName = $state('');
	let customerPhone = $state('');
	let customerId = $state('');
	let redeemPoints = $state<number | ''>('');

	let qrisSimulated = $state(false);
	let qrisUrl = $state('');
	let qrisLoading = $state(false);

	let selectedCustomer = $derived(customers.find(c => c.id === customerId));
	let maxPoints = $derived(selectedCustomer ? selectedCustomer.loyaltyPoints : 0);
	
	let pointDiscount = $derived((typeof redeemPoints === 'number' ? redeemPoints : 0) * 100);
	let finalTotal = $derived(Math.max(0, cartTotal - pointDiscount));
	
	let totalPaid = $derived(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
	let remaining = $derived(finalTotal - totalPaid);
	let changeAmount = $derived(totalPaid - finalTotal);
	let hasQris = $derived(payments.some((p) => p.method === 'qris'));

	$effect(() => {
		if (hasQris && !qrisUrl && !qrisLoading) {
			qrisLoading = true;
			// Call Midtrans backend to get snap/qris URL
			const qrisPayment = payments.find((p) => p.method === 'qris');
			const amount = qrisPayment ? Number(qrisPayment.amount) : finalTotal;
			
			fetch(`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/sales/qris-token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					amount,
					orderId: uuidv4()
				})
			})
			.then(res => res.json())
			.then(data => {
				if (data.success && data.data) {
					qrisUrl = data.data.redirect_url;
				}
			})
			.catch(console.error)
			.finally(() => {
				qrisLoading = false;
			});
		}
	});

	$effect(() => {
		if (open) {
			payments = [{ method: 'cash', amount: finalTotal.toString() }];
			customerName = '';
			customerPhone = '';
			customerId = '';
			redeemPoints = '';
			qrisSimulated = false;
		}
	});

	function addPaymentMethod() {
		payments = [...payments, { method: 'cash', amount: '' }];
	}

	function removePaymentMethod(index: number) {
		payments = payments.filter((_, i) => i !== index);
	}

	function handleSubmit() {
		const formattedPayments = payments
			.map((p) => ({ method: p.method, amount: Number(p.amount) || 0 }))
			.filter((p) => p.amount > 0);

		if (formattedPayments.length === 0) {
			formattedPayments.push({ method: 'cash', amount: finalTotal });
		}
		
		let cName = customerName;
		let cPhone = customerPhone;
		if (selectedCustomer) {
			cName = selectedCustomer.name;
			cPhone = selectedCustomer.phone || '';
		}
		
		onSubmit(formattedPayments, cName, cPhone, customerId || undefined, typeof redeemPoints === 'number' ? redeemPoints : 0);
	}

	function getMethodLabel(value: string) {
		return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
	}
</script>

<Dialog.Root {open} onOpenChange={(o) => !o && onClose()}>
	<Dialog.Content
		class="sm:max-w-[440px] max-h-[90vh] overflow-y-auto border-border bg-paper shadow-2xl rounded-2xl"
	>
		<Dialog.Header>
			<Dialog.Title class="font-grotesk text-2xl text-ink font-bold">Pembayaran</Dialog.Title>
			<Dialog.Description class="text-ink-soft">
				Selesaikan transaksi pesanan. Jika kurang bayar, akan dicatat sebagai Piutang.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4 space-y-5">
			<!-- Total Display -->
			<div class="text-center bg-muted/50 p-6 rounded-2xl border border-dashed border-border/60">
				<p class="text-[11px] text-ink-soft mb-2 font-bold uppercase tracking-widest font-mono">
					Total Tagihan
				</p>
				<p class="text-4xl font-extrabold text-ink font-grotesk tracking-tight">
					{formatRupiah(finalTotal)}
				</p>
				{#if pointDiscount > 0}
					<p class="text-xs font-bold text-brand mt-1 font-mono">Diskon Poin: -{formatRupiah(pointDiscount)}</p>
				{/if}
				{#if remaining > 0}
					<p class="text-sm font-bold text-cta mt-2 font-mono">Kurang: {formatRupiah(remaining)}</p>
				{:else if changeAmount > 0}
					<p class="text-sm font-bold text-success mt-2 font-mono">
						Kembalian: {formatRupiah(changeAmount)}
					</p>
				{/if}
			</div>

			<!-- Customer Info -->
			<div class="space-y-3">
				<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
					Data Pelanggan
				</Label>
				<Select.Root
					type="single"
					bind:value={customerId}
				>
					<Select.Trigger
						class="w-full h-11 rounded-xl border-border font-semibold text-sm text-ink bg-paper"
					>
						{selectedCustomer ? selectedCustomer.name : 'Pilih Pelanggan (Opsional)'}
					</Select.Trigger>
					<Select.Content class="rounded-xl border-border bg-paper shadow-xl max-h-[200px]">
						<Select.Item value="" class="rounded-lg font-medium cursor-pointer"
							>Tidak ada (Pelanggan Umum)</Select.Item
						>
						{#each customers as c}
							<Select.Item value={c.id} class="rounded-lg font-medium cursor-pointer">
								{c.name} {c.phone ? `- ${c.phone}` : ''}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				
				{#if !selectedCustomer}
					<div class="grid grid-cols-2 gap-2">
						<Input
							bind:value={customerName}
							placeholder="Nama (Opsional)"
							class="border-border focus-visible:ring-brand rounded-xl h-10 text-sm"
						/>
						<Input
							bind:value={customerPhone}
							placeholder="No. HP (Opsional)"
							class="border-border focus-visible:ring-brand rounded-xl h-10 text-sm"
							type="tel"
						/>
					</div>
				{:else}
					<div class="bg-brand/5 p-3 rounded-xl border border-brand/20 space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-[10px] font-bold text-brand uppercase tracking-wider font-mono">Loyalty Points (Maks: {maxPoints})</span>
						</div>
						<div class="flex gap-2 items-center">
							<Input
								type="number"
								bind:value={redeemPoints}
								min="0"
								max={maxPoints}
								oninput={() => {
									if (typeof redeemPoints === 'number' && redeemPoints > maxPoints) {
										redeemPoints = maxPoints;
									}
								}}
								placeholder="Jml Redeem"
								class="border-brand/30 focus-visible:ring-brand rounded-lg bg-white h-9"
							/>
							<span class="text-xs text-brand font-bold whitespace-nowrap font-mono bg-brand/10 px-2 py-1.5 rounded-md">
								-{formatRupiah(pointDiscount)}
							</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Payment Methods -->
			<div class="space-y-3">
				<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
					Metode Pembayaran
				</Label>
				{#each payments as payment, i}
					<div class="flex gap-2 items-center">
						<!-- shadcn Select replacing native <select> -->
						<Select.Root
							type="single"
							value={payment.method}
							onValueChange={(v) => {
								if (v) payments[i].method = v;
							}}
						>
							<Select.Trigger
								class="w-[40%] h-11 rounded-xl border-border font-semibold text-sm text-ink bg-paper"
							>
								{getMethodLabel(payment.method)}
							</Select.Trigger>
							<Select.Content class="rounded-xl border-border bg-paper shadow-lg">
								{#each PAYMENT_METHODS as method}
									<Select.Item
										value={method.value}
										class="font-semibold text-sm cursor-pointer rounded-lg hover:bg-muted"
									>
										{method.label}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						<div class="relative flex-1">
							<span
								class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft font-bold text-sm font-mono"
								>Rp</span
							>
							<Input
								type="number"
								bind:value={payment.amount}
								placeholder="0"
								class="pl-10 h-11 font-mono font-bold text-lg border-border focus-visible:ring-brand rounded-xl"
							/>
						</div>
						{#if payments.length > 1}
							<Button
								variant="ghost"
								size="icon"
								class="text-danger shrink-0 rounded-full hover:bg-danger/10 h-11 w-11"
								onclick={() => removePaymentMethod(i)}
								aria-label="Hapus metode pembayaran"
							>
								<Trash2 class="w-4 h-4" />
							</Button>
						{/if}
					</div>
				{/each}
				<Button
					variant="outline"
					size="sm"
					onclick={addPaymentMethod}
					class="w-full rounded-xl border-dashed border-border text-ink-soft hover:text-ink"
				>
					+ Tambah Metode Lain
				</Button>
			</div>

			<!-- QRIS Simulation / Real Midtrans -->
			{#if hasQris}
				<div
					class="bg-muted p-4 rounded-2xl flex flex-col items-center justify-center space-y-4 border border-dashed border-border/50"
				>
					<p class="font-bold text-sm text-ink font-mono uppercase tracking-widest">
						Scan QRIS (Midtrans)
					</p>
					
					{#if qrisLoading}
						<div class="w-40 h-40 flex items-center justify-center">
							<div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
						</div>
					{:else if qrisUrl}
						<a href={qrisUrl} target="_blank" rel="noreferrer" class="text-brand hover:underline font-bold text-sm text-center">
							Buka Halaman Midtrans Snap
						</a>
					{:else}
						<div
							class="w-40 h-40 bg-white border-2 border-dashed border-brand/40 flex items-center justify-center rounded-xl shadow-inner"
						>
							<span class="text-ink-soft text-xs text-center font-semibold"
								>QR Code Dummy<br />Gagal memuat Midtrans</span
							>
						</div>
					{/if}

					{#if !qrisSimulated}
						<Button
							size="sm"
							class="rounded-full bg-brand hover:bg-brand-dark"
							onclick={() => (qrisSimulated = true)}
						>
							Simulasikan Pembayaran Berhasil
						</Button>
					{:else}
						<p
							class="text-success font-bold text-sm bg-success/10 px-3 py-1.5 rounded-full flex items-center gap-2"
						>
							<span class="w-2 h-2 rounded-full bg-success"></span>
							Pembayaran Berhasil
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0 mt-2 border-t border-border/50 pt-4">
			<Button variant="ghost" onclick={onClose} class="w-full sm:w-auto rounded-full font-bold">
				Batal
			</Button>
			<Button
				onclick={handleSubmit}
				disabled={processingPayment || (hasQris && !qrisSimulated)}
				class="w-full sm:w-auto rounded-full font-bold bg-brand hover:bg-brand-dark shadow-md gap-2"
			>
				{#if processingPayment}
					<div
						class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
					></div>
					Memproses...
				{:else}
					Selesaikan
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
