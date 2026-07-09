<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/PageHeader.svelte';

	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

	let debt = $state({
		type: 'receivable', // default
		entity_name: '',
		entity_phone: '',
		amount: '',
		due_date: '',
		notes: ''
	});

	let isSubmitting = $state(false);

	async function submitDebt() {
		if (!debt.entity_name) {
			toast.error('Nama Pihak/Toko/Pelanggan wajib diisi');
			return;
		}
		if (!debt.amount || Number(debt.amount) <= 0) {
			toast.error('Nominal harus lebih dari 0');
			return;
		}

		isSubmitting = true;

		try {
			const token = localStorage.getItem('umkm_token');
			const res = await fetch(`${API_URL}/v1/debts`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...debt,
					amount: Number(debt.amount)
				})
			});

			const json = await res.json();
			if (json.success) {
				toast.success('Catatan berhasil disimpan');
				goto('/debts');
			} else {
				toast.error(json.error.message);
			}
		} catch (err) {
			toast.error('Gagal menyimpan catatan');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Catat Hutang/Piutang — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Catat Hutang / Piutang" subtitle="Tambah data tagihan baru" backHref="/debts" />

	<main class="p-4 sm:p-6 max-w-2xl mx-auto w-full flex-1">
		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
			<Card.Content class="p-5 sm:p-6 space-y-6">
				<div class="space-y-4">
					<div class="space-y-2">
						<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
							Jenis Catatan <span class="text-cta">*</span>
						</Label>
						<RadioGroup.Root bind:value={debt.type} class="grid grid-cols-2 gap-3">
							<Label
								for="receivable"
								class="flex flex-col items-center justify-center gap-2 p-3.5 border-1.5 border-border rounded-xl cursor-pointer transition [&:has([data-state=checked])]:border-brand [&:has([data-state=checked])]:bg-brand-soft [&:has([data-state=checked])]:text-brand"
							>
								<RadioGroup.Item value="receivable" id="receivable" class="sr-only" />
								<span class="text-center font-bold text-sm">Piutang (Orang ngutang ke kita)</span>
							</Label>
							<Label
								for="payable"
								class="flex flex-col items-center justify-center gap-2 p-3.5 border-1.5 border-border rounded-xl cursor-pointer transition [&:has([data-state=checked])]:border-cta [&:has([data-state=checked])]:bg-cta-soft [&:has([data-state=checked])]:text-cta"
							>
								<RadioGroup.Item value="payable" id="payable" class="sr-only" />
								<span class="text-center font-bold text-sm">Hutang (Kita ngutang ke supplier)</span>
							</Label>
						</RadioGroup.Root>
					</div>

					<div class="space-y-2">
						<Label for="entityName" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
							{debt.type === 'receivable' ? 'Nama Pelanggan' : 'Nama Supplier / Pihak'}
							<span class="text-cta">*</span>
						</Label>
						<Input
							id="entityName"
							type="text"
							bind:value={debt.entity_name}
							placeholder="Mis. Pak Budi"
							class="h-12 rounded-xl border-border bg-paper-alt font-medium"
						/>
					</div>

					<div class="space-y-2">
						<Label for="entityPhone" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">No. WhatsApp (Opsional, untuk pengingat)</Label>
						<Input
							id="entityPhone"
							type="tel"
							bind:value={debt.entity_phone}
							placeholder="08123456789"
							class="h-12 rounded-xl border-border bg-paper-alt font-mono font-medium"
						/>
					</div>

					<div class="space-y-2">
						<Label for="amount" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
							Total Nominal <span class="text-cta">*</span>
						</Label>
						<div class="relative">
							<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint font-mono font-semibold">Rp</span>
							<Input
								id="amount"
								type="number"
								min="0"
								bind:value={debt.amount}
								class="pl-10 font-mono font-bold text-lg h-12 rounded-xl border-border bg-paper-alt"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="dueDate" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Tanggal Jatuh Tempo (Opsional)</Label>
						<Input
							id="dueDate"
							type="date"
							bind:value={debt.due_date}
							class="h-12 rounded-xl border-border bg-paper-alt font-medium"
						/>
					</div>

					<div class="space-y-2">
						<Label for="notes" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Catatan Tambahan (Opsional)</Label>
						<Textarea
							id="notes"
							bind:value={debt.notes}
							rows={3}
							placeholder="Misal: Bon nota no. 1234"
							class="rounded-xl border-border bg-paper-alt font-medium"
						/>
					</div>
				</div>
			</Card.Content>
			
			<Card.Footer class="px-5 sm:px-6 pb-6">
				<Button
					variant="cta"
					onclick={submitDebt}
					disabled={isSubmitting || !debt.entity_name || !debt.amount}
					class="w-full font-bold rounded-xl h-12 shadow-md hover:-translate-y-0.5 transition-all"
					size="lg"
				>
					{#if isSubmitting}
						<div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></div>
						Menyimpan...
					{:else}
						Simpan Catatan
					{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	</main>
</div>
