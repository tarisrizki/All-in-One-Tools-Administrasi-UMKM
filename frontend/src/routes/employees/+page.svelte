<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';

	let employees = $state<any[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Pastikan user memiliki izin
	$effect(() => {
		if (
			authState.user &&
			authState.user.role_name !== 'owner' &&
			authState.user.role_name !== 'admin'
		) {
			goto('/');
		}
	});

	async function fetchEmployees() {
		loading = true;
		try {
			const res = await fetch(`${API_URL}/v1/employees`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				employees = data.data;
			} else {
				errorMsg = data.error?.message || 'Gagal mengambil data karyawan.';
			}
		} catch (e) {
			console.error(e);
			errorMsg = 'Kesalahan jaringan.';
		} finally {
			loading = false;
		}
	}

	async function toggleStatus(emp: any) {
		try {
			const newStatus = !emp.is_active;
			const res = await fetch(`${API_URL}/v1/employees/${emp.id}/status`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ is_active: newStatus })
			});
			const data = await res.json();

			if (data.success) {
				emp.is_active = newStatus;
				toast.success(`Status ${emp.name} berhasil diubah.`);
			} else {
				toast.error(data.error?.message || 'Gagal mengubah status');
			}
		} catch (e) {
			console.error(e);
			toast.error('Kesalahan jaringan');
		}
	}

	onMount(() => {
		if (
			authState.user &&
			(authState.user.role_name === 'owner' || authState.user.role_name === 'admin')
		) {
			fetchEmployees();
		}
	});
</script>

<svelte:head>
	<title>Kelola Karyawan | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex justify-between items-center sticky top-0 z-10">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" href="/">
				←
			</Button>
			<h1 class="text-lg font-bold">Karyawan & Akses</h1>
		</div>
		<Button href="/employees/new" size="sm">
			+ Tambah
		</Button>
	</header>

	<main class="p-4 max-w-xl mx-auto space-y-4 mt-2">
		{#if errorMsg}
			<div class="bg-destructive/15 text-destructive p-3 rounded-md text-sm border border-destructive/20">
				{errorMsg}
			</div>
		{/if}

		{#if loading}
			<div class="flex justify-center p-8">
				<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else if employees.length === 0}
			<div class="text-center p-8 text-muted-foreground text-sm border border-dashed rounded-md bg-background">
				Belum ada karyawan.
			</div>
		{:else}
			<div class="space-y-3">
				{#each employees as emp}
					<Card.Root class={!emp.is_active ? 'opacity-60 border-destructive/50' : ''}>
						<Card.Content class="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
							<div>
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-bold text-lg">{emp.name}</h3>
									{#if !emp.is_active}
										<Badge variant="destructive" class="text-[10px]">NONAKTIF</Badge>
									{/if}
								</div>
								<p class="text-sm text-muted-foreground mb-2">{emp.phone}</p>

								<Badge variant="outline" class="uppercase text-xs tracking-wide">
									Role: {emp.role_name}
								</Badge>
							</div>

							{#if emp.id !== authState.user?.userId && emp.role_name !== 'owner'}
								<div class="flex justify-end">
									<Button 
										variant={emp.is_active ? "destructive" : "outline"} 
										size="sm"
										onclick={() => toggleStatus(emp)}
									>
										{emp.is_active ? 'Nonaktifkan' : 'Aktifkan'}
									</Button>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<p class="text-[10px] text-muted-foreground text-center mt-4">
				Karyawan yang dinonaktifkan tidak akan bisa login ke dalam sistem.
			</p>
		{/if}
	</main>
</div>
