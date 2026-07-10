<script lang="ts">
	import { apiClient } from '$lib/utils/api';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/PageHeader.svelte';

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
			const data = await apiClient('/customers', {
				method: 'POST',
				body: JSON.stringify(form)
			});

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
	<title>Tambah Pelanggan — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Pelanggan Baru" subtitle="Database Pelanggan" backHref="/customers" />

	<main class="p-4 sm:p-6 max-w-md mx-auto w-full flex-1">
		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
			<Card.Content class="p-5 sm:p-6 space-y-5">
				<div class="space-y-2">
					<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
						Nama Lengkap <span class="text-cta">*</span>
					</Label>
					<Input type="text" bind:value={form.name} placeholder="Mis. Budi Santoso" class="h-12 rounded-xl border-border bg-paper-alt font-medium" />
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Nomor WhatsApp</Label>
					<Input type="tel" bind:value={form.phone} placeholder="Mis. 08123456789" class="h-12 rounded-xl border-border bg-paper-alt font-mono font-medium" />
					<p class="text-[11px] text-ink-faint mt-1">
						Gunakan format angka untuk memudahkan klik Hubungi WA nanti.
					</p>
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Email</Label>
					<Input type="email" bind:value={form.email} placeholder="budi@example.com" class="h-12 rounded-xl border-border bg-paper-alt font-medium" />
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Alamat Domisili</Label>
					<Textarea bind:value={form.address} rows={3} placeholder="Opsional..." class="rounded-xl border-border bg-paper-alt font-medium" />
				</div>

				<Button variant="cta" onclick={handleSave} disabled={loading} class="w-full mt-2 rounded-xl h-12 font-bold shadow-md hover:-translate-y-0.5 transition-all">
					{#if loading}
						<div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></div>
						Menyimpan...
					{:else}
						Simpan Data Pelanggan
					{/if}
				</Button>
			</Card.Content>
		</Card.Root>
	</main>
</div>
