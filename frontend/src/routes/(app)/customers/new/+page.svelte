<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';

	let form = $state({
		name: '',
		phone: '',
		email: '',
		address: ''
	});

	let loading = $state(false);

	async function handleSave() {
		if (!form.name.trim()) {
			toast.error('Nama pelanggan wajib diisi.');
			return;
		}

		loading = true;

		try {
			const res = await fetch(`${API_URL}/v1/customers`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form)
			});
			const data = await res.json();

			if (data.success) {
				toast.success('Pelanggan berhasil disimpan');
				goto('/customers');
			} else {
				toast.error(data.error?.message || 'Gagal menyimpan pelanggan.');
			}
		} catch (e) {
			console.error(e);
			toast.error('Terjadi kesalahan jaringan.');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Tambah Pelanggan | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
		<Button variant="ghost" size="icon" href="/customers">
			←
		</Button>
		<h1 class="text-lg font-bold">Pelanggan Baru</h1>
	</header>

	<main class="p-4 max-w-md mx-auto space-y-4 mt-2">
		<Card.Root>
			<Card.Content class="p-5 space-y-4">
				<div class="space-y-2">
					<Label>
						Nama Lengkap <span class="text-destructive">*</span>
					</Label>
					<Input
						type="text"
						bind:value={form.name}
						placeholder="Mis. Budi Santoso"
					/>
				</div>

				<div class="space-y-2">
					<Label>Nomor WhatsApp</Label>
					<Input
						type="tel"
						bind:value={form.phone}
						placeholder="Mis. 08123456789"
					/>
					<p class="text-[10px] text-muted-foreground mt-1">
						Gunakan format angka untuk memudahkan klik Hubungi WA nanti.
					</p>
				</div>

				<div class="space-y-2">
					<Label>Email</Label>
					<Input
						type="email"
						bind:value={form.email}
						placeholder="budi@example.com"
					/>
				</div>

				<div class="space-y-2">
					<Label>Alamat Domisili</Label>
					<Textarea
						bind:value={form.address}
						rows={3}
						placeholder="Opsional..."
					/>
				</div>

				<Button
					variant="cta"
					onclick={handleSave}
					disabled={loading}
					class="w-full mt-2"
				>
					{#if loading}
						<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
						Menyimpan...
					{:else}
						Simpan Data Pelanggan
					{/if}
				</Button>
			</Card.Content>
		</Card.Root>
	</main>
</div>
