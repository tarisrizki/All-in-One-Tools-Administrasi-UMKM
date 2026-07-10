<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { UserCog, Plus } from '@lucide/svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
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
			goto('/dashboard');
		}
	});

	async function fetchEmployees() {
		loading = true;
		try {
			const data = await apiClient(`/employees`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
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
			const data = await apiClient(`/employees/${emp.id}/status`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ is_active: newStatus })
			});

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
	<title>Karyawan — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Karyawan & Akses" subtitle="Manajemen Pengguna">
		{#snippet actions()}
			<Button
				href="/employees/new"
				size="sm"
				class="rounded-full bg-brand hover:bg-brand-dark text-white font-bold shadow-md hover:-translate-y-0.5 transition-all gap-1.5 h-10 px-4"
			>
				<Plus class="w-4 h-4" />
				<span class="hidden sm:inline">Tambah</span>
			</Button>
		{/snippet}
	</PageHeader>

	<main class="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-4 mt-2 flex-1">
		{#if errorMsg}
			<div class="bg-danger/10 text-danger p-4 rounded-xl border border-danger/20 font-mono text-sm">
				{errorMsg}
			</div>
		{/if}

		{#if loading}
			<LoadingSpinner message="Memuat data karyawan..." />
		{:else if employees.length === 0}
			<div class="text-center p-10 text-ink-soft border-2 border-dashed border-border/60 rounded-2xl bg-paper-alt">
				<UserCog class="w-10 h-10 mx-auto mb-3 opacity-30" />
				<p class="font-bold font-grotesk text-ink">Belum ada karyawan</p>
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
