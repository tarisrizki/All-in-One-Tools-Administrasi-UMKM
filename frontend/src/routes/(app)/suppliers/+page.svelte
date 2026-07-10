<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import { Building2, User, Phone, MapPin, Plus } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let suppliers = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Modal state
	let showAddModal = $state(false);
	let newSupplier = $state({
		name: '',
		contact_name: '',
		phone: '',
		address: ''
	});
	let isSubmitting = $state(false);

	async function fetchSuppliers() {
		loading = true;
		try {
			const json = await apiClient(`/suppliers`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			if (json.success) {
				suppliers = json.data;
			} else {
				error = json.error?.message || 'Gagal mengambil data pemasok';
			}
		} catch (err) {
			error = 'Gagal menghubungi server';
		} finally {
			loading = false;
		}
	}

	async function saveSupplier() {
		if (!newSupplier.name) {
			toast.error('Nama supplier wajib diisi');
			return;
		}

		isSubmitting = true;
		try {
			const json = await apiClient(`/suppliers`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newSupplier)
			});
			if (json.success) {
				showAddModal = false;
				newSupplier = { name: '', contact_name: '', phone: '', address: '' };
				toast.success('Pemasok berhasil ditambahkan');
				await fetchSuppliers();
			} else {
				toast.error(json.error?.message || 'Gagal menyimpan pemasok');
			}
		} catch (err) {
			toast.error('Kesalahan jaringan');
		} finally {
			isSubmitting = false;
		}
	}

	onMount(() => {
		fetchSuppliers();
	});
</script>

<svelte:head>
	<title>Pemasok — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Pemasok (Supplier)" subtitle="Database">
		{#snippet actions()}
			<Button
				onclick={() => (showAddModal = true)}
				size="sm"
				class="rounded-full bg-brand hover:bg-brand-dark text-white font-bold shadow-md hover:-translate-y-0.5 transition-all gap-1.5 h-10 px-4"
			>
				<Plus class="w-4 h-4" />
				<span class="hidden sm:inline">Tambah Pemasok</span>
			</Button>
		{/snippet}
	</PageHeader>

	<main class="p-4 sm:p-6 container-base space-y-5 mt-2 flex-1">
		{#if loading}
			<LoadingSpinner message="Memuat data pemasok..." />
		{:else if error}
			<div class="bg-danger/10 text-danger p-4 rounded-xl border border-danger/20 font-mono text-sm">
				{error}
			</div>
		{:else if suppliers.length === 0}
			<EmptyState
				icon={Building2}
				title="Belum Ada Pemasok"
				description="Tambahkan data supplier pertama Anda untuk memudahkan proses pembelian barang."
			/>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each suppliers as supplier}
					<Card.Root class="hover:border-brand/40 transition-all duration-200 bg-paper shadow-sm border-border rounded-xl overflow-hidden">
						<Card.Content class="p-4 flex flex-col h-full">
							<div class="flex justify-between items-start mb-4">
								<h3 class="font-bold text-ink text-base font-grotesk tracking-tight truncate">
									{supplier.name}
								</h3>
								{#if !supplier.is_active}
									<Badge variant="outline" class="font-mono tracking-widest text-[10px] bg-muted text-ink-soft border-border shadow-none px-2 rounded-md">
										NONAKTIF
									</Badge>
								{/if}
							</div>

							<div class="space-y-2 mt-auto">
								<div class="flex items-center gap-2 text-ink-soft text-sm font-mono">
									<User class="w-4 h-4 shrink-0 text-brand opacity-80" />
									<span class="truncate">{supplier.contact_name || '-'}</span>
								</div>
								<div class="flex items-center gap-2 text-ink-soft text-sm font-mono">
									<Phone class="w-4 h-4 shrink-0 text-brand opacity-80" />
									<span>{supplier.phone || '-'}</span>
								</div>
								<div class="flex items-start gap-2 text-ink-soft text-sm font-mono">
									<MapPin class="w-4 h-4 shrink-0 mt-0.5 text-brand opacity-80" />
									<span class="line-clamp-2">{supplier.address || '-'}</span>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</main>
</div>

<Dialog.Root bind:open={showAddModal}>
	<Dialog.Content class="sm:max-w-[425px] border-border bg-paper shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="font-grotesk text-2xl text-ink font-bold">Tambah Pemasok</Dialog.Title>
			<Dialog.Description class="text-ink-soft">
				Masukkan detail pemasok baru di bawah ini.
			</Dialog.Description>
		</Dialog.Header>
		
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
					Nama Perusahaan/Toko <span class="text-cta">*</span>
				</Label>
				<Input
					type="text"
					bind:value={newSupplier.name}
					placeholder="Mis. PT Bina Sejahtera"
					class="border-border focus-visible:ring-brand rounded-xl"
				/>
			</div>
			
			<div class="space-y-2">
				<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Nama Kontak PIC</Label>
				<Input
					type="text"
					bind:value={newSupplier.contact_name}
					placeholder="Mis. Bpk. Budi"
					class="border-border focus-visible:ring-brand rounded-xl"
				/>
			</div>
			
			<div class="space-y-2">
				<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Nomor Telepon/WA</Label>
				<Input
					type="tel"
					bind:value={newSupplier.phone}
					placeholder="08..."
					class="border-border focus-visible:ring-brand rounded-xl"
				/>
			</div>
			
			<div class="space-y-2">
				<Label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">Alamat Lengkap</Label>
				<Textarea
					bind:value={newSupplier.address}
					rows={3}
					placeholder="Alamat pengiriman/tagihan..."
					class="border-border focus-visible:ring-brand rounded-xl"
				/>
			</div>
		</div>
		
		<Dialog.Footer class="gap-2 sm:gap-0 mt-2 border-t border-border/50 pt-4">
			<Button variant="ghost" onclick={() => (showAddModal = false)} class="w-full sm:w-auto rounded-full font-bold">
				Batal
			</Button>
			<Button 
				onclick={saveSupplier} 
				disabled={isSubmitting || !newSupplier.name}
				class="w-full sm:w-auto rounded-full font-bold bg-brand hover:bg-brand-dark shadow-md gap-2"
			>
				{#if isSubmitting}
					<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					Menyimpan...
				{:else}
					Simpan Pemasok
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
