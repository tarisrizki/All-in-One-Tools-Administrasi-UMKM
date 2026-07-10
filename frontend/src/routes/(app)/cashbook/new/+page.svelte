<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let type = $state('out');
	let amount = $state('');
	let description = $state('');

	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;

		try {
			const result = await apiClient(`/cashbook`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type,
					amount: Number(amount),
					description
				})
			});

			if (result.success) {
				toast.success('Transaksi berhasil dicatat');
				goto('/cashbook');
			} else {
				toast.error(result.error?.message || 'Gagal menyimpan transaksi');
			}
		} catch (err) {
			toast.error('Koneksi ke server gagal');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Catat Transaksi Kas — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Catat Transaksi Kas" subtitle="Buku Kas" backHref="/cashbook" />

	<main class="p-4 sm:p-6 max-w-lg mx-auto w-full flex-1">
		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
			<form onsubmit={handleSubmit}>
				<Card.Content class="p-5 sm:p-6 space-y-6">
					<div class="space-y-3">
						<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Jenis Transaksi</Label>
						<RadioGroup.Root bind:value={type} class="flex flex-col gap-3 sm:flex-row sm:gap-6">
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="out" id="out" />
								<Label for="out" class="text-cta font-bold cursor-pointer">Pengeluaran</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="in" id="in" />
								<Label for="in" class="text-success font-bold cursor-pointer">Pemasukan</Label>
							</div>
						</RadioGroup.Root>
					</div>

					<div class="space-y-2">
						<Label for="amount" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Nominal (Rp) <span class="text-cta">*</span></Label>
						<div class="relative">
							<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint font-mono font-semibold">Rp</span>
							<Input
								type="number"
								id="amount"
								bind:value={amount}
								required
								class="pl-10 font-mono font-bold text-lg h-12 rounded-xl border-border bg-paper-alt"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="description" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Keterangan <span class="text-cta">*</span></Label>
						<Input
							type="text"
							id="description"
							bind:value={description}
							required
							placeholder="Mis: Beli kantong plastik"
							class="h-12 rounded-xl border-border bg-paper-alt font-medium"
						/>
					</div>
				</Card.Content>
				<Card.Footer class="px-5 sm:px-6 pb-6">
					<Button
						type="submit"
						variant="cta"
						disabled={loading}
						class="w-full font-bold rounded-xl h-12 shadow-md hover:-translate-y-0.5 transition-all"
						size="lg"
					>
						{#if loading}
							<div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></div>
							Menyimpan...
						{:else}
							Simpan Transaksi
						{/if}
					</Button>
				</Card.Footer>
			</form>
		</Card.Root>
	</main>
</div>
