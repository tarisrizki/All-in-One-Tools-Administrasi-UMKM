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
			const token = localStorage.getItem('token');
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
	<title>Catat Hutang/Piutang | UMKM Tools</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6 pb-20 p-4">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" class="rounded-full shrink-0" href="/debts">
			←
		</Button>
		<div>
			<h1 class="text-2xl font-bold">Catat Hutang / Piutang</h1>
			<p class="text-muted-foreground text-sm mt-1">Tambah data tagihan baru ke dalam buku.</p>
		</div>
	</div>

	<Card.Root>
		<Card.Content class="p-6 space-y-6">
			<div class="space-y-4">
				<div class="space-y-2">
					<Label>
						Jenis Catatan <span class="text-destructive">*</span>
					</Label>
					<RadioGroup.Root bind:value={debt.type} class="grid grid-cols-2 gap-3">
						<Label
							for="receivable"
							class="flex flex-col items-center justify-center gap-2 p-3 border rounded-md cursor-pointer transition [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10 [&:has([data-state=checked])]:text-primary"
						>
							<RadioGroup.Item value="receivable" id="receivable" class="sr-only" />
							<span class="text-center font-medium">Piutang (Orang ngutang ke kita)</span>
						</Label>
						<Label
							for="payable"
							class="flex flex-col items-center justify-center gap-2 p-3 border rounded-md cursor-pointer transition [&:has([data-state=checked])]:border-destructive [&:has([data-state=checked])]:bg-destructive/10 [&:has([data-state=checked])]:text-destructive"
						>
							<RadioGroup.Item value="payable" id="payable" class="sr-only" />
							<span class="text-center font-medium">Hutang (Kita ngutang ke supplier)</span>
						</Label>
					</RadioGroup.Root>
				</div>

				<div class="space-y-2">
					<Label for="entityName">
						{debt.type === 'receivable' ? 'Nama Pelanggan' : 'Nama Supplier / Pihak'}
						<span class="text-destructive">*</span>
					</Label>
					<Input
						id="entityName"
						type="text"
						bind:value={debt.entity_name}
						placeholder="Mis. Pak Budi"
					/>
				</div>

				<div class="space-y-2">
					<Label for="entityPhone">No. WhatsApp (Opsional, untuk pengingat)</Label>
					<Input
						id="entityPhone"
						type="tel"
						bind:value={debt.entity_phone}
						placeholder="08123456789"
					/>
				</div>

				<div class="space-y-2">
					<Label for="amount">
						Total Nominal <span class="text-destructive">*</span>
					</Label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rp</span>
						<Input
							id="amount"
							type="number"
							min="0"
							bind:value={debt.amount}
							class="pl-9 font-bold text-lg"
							placeholder="0"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="dueDate">Tanggal Jatuh Tempo (Opsional)</Label>
					<Input
						id="dueDate"
						type="date"
						bind:value={debt.due_date}
					/>
				</div>

				<div class="space-y-2">
					<Label for="notes">Catatan Tambahan (Opsional)</Label>
					<Textarea
						id="notes"
						bind:value={debt.notes}
						rows={3}
						placeholder="Misal: Bon nota no. 1234"
					/>
				</div>
			</div>

			<div class="pt-4 border-t flex justify-end">
				<Button
					onclick={submitDebt}
					disabled={isSubmitting || !debt.entity_name || !debt.amount}
					class="w-full sm:w-auto px-8"
				>
					{#if isSubmitting}
						<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
						Menyimpan...
					{:else}
						Simpan Catatan
					{/if}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
