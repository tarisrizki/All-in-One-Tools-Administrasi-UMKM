<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';

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
			const token = localStorage.getItem('token');
			const res = await fetch(`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/suppliers`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const json = await res.json();
			if (json.success) {
				suppliers = json.data;
			} else {
				error = json.error.message;
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
			const token = localStorage.getItem('token');
			const res = await fetch(`${env.PUBLIC_API_URL || 'http://localhost:3000'}/v1/suppliers`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newSupplier)
			});
			const json = await res.json();
			if (json.success) {
				showAddModal = false;
				newSupplier = { name: '', contact_name: '', phone: '', address: '' };
				toast.success('Pemasok berhasil ditambahkan');
				await fetchSuppliers();
			} else {
				toast.error(json.error.message);
			}
		} catch (err) {
			toast.error('Gagal menyimpan supplier');
		} finally {
			isSubmitting = false;
		}
	}

	onMount(() => {
		fetchSuppliers();
	});
</script>

<svelte:head>
	<title>Pemasok (Supplier) | UMKM Tools</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6 p-4">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" href="/">
				←
			</Button>
			<div>
				<h1 class="text-2xl font-bold">Pemasok (Supplier)</h1>
				<p class="text-muted-foreground text-sm mt-1">Kelola data pemasok barang toko Anda.</p>
			</div>
		</div>
		<Button variant="cta" onclick={() => (showAddModal = true)}>
			+ Tambah Pemasok
		</Button>
	</div>

	{#if loading}
		<div class="flex justify-center p-12">
			<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if error}
		<div class="bg-destructive/15 text-destructive p-4 rounded-md border border-destructive/20">
			{error}
		</div>
	{:else if suppliers.length === 0}
		<Card.Root class="text-center">
			<Card.Content class="p-12 flex flex-col items-center">
				<div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
					<svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
					</svg>
				</div>
				<h3 class="text-lg font-bold mb-2">Belum Ada Pemasok</h3>
				<p class="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
					Tambahkan data supplier pertama Anda untuk memudahkan proses pembelian barang.
				</p>
				<Button variant="cta" onclick={() => (showAddModal = true)}>
					+ Tambah Pemasok
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each suppliers as supplier}
				<Card.Root>
					<Card.Content class="p-4">
						<div class="flex justify-between items-start mb-2">
							<h3 class="text-lg font-bold">{supplier.name}</h3>
							{#if !supplier.is_active}
								<Badge variant="secondary">Nonaktif</Badge>
							{/if}
						</div>

						<div class="space-y-2 mt-4 text-sm">
							<div class="flex items-center gap-2 text-muted-foreground">
								<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
								</svg>
								<span class="truncate">{supplier.contact_name || '-'}</span>
							</div>
							<div class="flex items-center gap-2 text-muted-foreground">
								<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
								</svg>
								<span>{supplier.phone || '-'}</span>
							</div>
							<div class="flex items-center gap-2 text-muted-foreground">
								<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
								</svg>
								<span class="line-clamp-2">{supplier.address || '-'}</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<Dialog.Root bind:open={showAddModal}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Tambah Pemasok Baru</Dialog.Title>
			<Dialog.Description>
				Masukkan detail pemasok baru di bawah ini.
			</Dialog.Description>
		</Dialog.Header>
		
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label>
					Nama Perusahaan/Toko <span class="text-destructive">*</span>
				</Label>
				<Input
					type="text"
					bind:value={newSupplier.name}
					placeholder="Mis. PT Bina Sejahtera"
				/>
			</div>
			
			<div class="space-y-2">
				<Label>Nama Kontak PIC</Label>
				<Input
					type="text"
					bind:value={newSupplier.contact_name}
					placeholder="Mis. Bpk. Budi"
				/>
			</div>
			
			<div class="space-y-2">
				<Label>Nomor Telepon/WA</Label>
				<Input
					type="tel"
					bind:value={newSupplier.phone}
					placeholder="08..."
				/>
			</div>
			
			<div class="space-y-2">
				<Label>Alamat Lengkap</Label>
				<Textarea
					bind:value={newSupplier.address}
					rows={3}
					placeholder="Alamat pengiriman/tagihan..."
				/>
			</div>
		</div>
		
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddModal = false)}>
				Batal
			</Button>
			<Button 
				onclick={saveSupplier} 
				disabled={isSubmitting || !newSupplier.name}
			>
				{#if isSubmitting}
					<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
					Menyimpan...
				{:else}
					Simpan Pemasok
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
