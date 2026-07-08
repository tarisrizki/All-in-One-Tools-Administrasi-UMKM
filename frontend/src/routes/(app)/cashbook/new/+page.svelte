<script lang="ts">
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
	import { ArrowLeft } from 'lucide-svelte';

	let type = $state('out');
	let amount = $state('');
	let description = $state('');

	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;

		try {
			const res = await fetch(`${API_URL}/v1/cashbook`, {
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

			const result = await res.json();

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

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
		<Button variant="ghost" size="icon" href="/cashbook">
			<ArrowLeft class="w-5 h-5" />
		</Button>
		<h1 class="text-lg font-bold">Catat Transaksi Kas</h1>
	</header>

	<main class="p-4 max-w-lg mx-auto mt-4">
		<Card.Root>
			<form onsubmit={handleSubmit}>
				<Card.Content class="pt-6 space-y-6">
					<div class="space-y-3">
						<Label class="text-base">Jenis Transaksi</Label>
						<RadioGroup.Root bind:value={type} class="flex flex-col gap-3 sm:flex-row sm:gap-6">
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="out" id="out" />
								<Label for="out" class="text-destructive font-medium cursor-pointer">Pengeluaran</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="in" id="in" />
								<Label for="in" class="text-primary font-medium cursor-pointer">Pemasukan</Label>
							</div>
						</RadioGroup.Root>
					</div>

					<div class="space-y-2">
						<Label for="amount">Nominal (Rp) <span class="text-destructive">*</span></Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rp</span>
							<Input
								type="number"
								id="amount"
								bind:value={amount}
								required
								class="pl-10 font-bold text-lg h-12"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="description">Keterangan <span class="text-destructive">*</span></Label>
						<Input
							type="text"
							id="description"
							bind:value={description}
							required
							placeholder="Mis: Beli kantong plastik"
						/>
					</div>
				</Card.Content>
				<Card.Footer>
					<Button
						type="submit"
						variant="cta"
						disabled={loading}
						class="w-full font-bold"
						size="lg"
					>
						{#if loading}
							<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
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
