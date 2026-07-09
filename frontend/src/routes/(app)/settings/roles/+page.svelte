<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { onMount } from 'svelte';
	import { authState, hasPermission } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { ShieldCheck, Plus, Trash2, Edit } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import RoleForm from '$lib/components/settings/RoleForm.svelte';

	let roles = $state<any[]>([]);
	let loading = $state(true);
	
	let isFormOpen = $state(false);
	let selectedRole = $state<any | null>(null);

	async function fetchRoles() {
		try {
			const res = await fetch(`${API_URL}/v1/roles`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				roles = data.data;
			} else {
				toast.error(data.error?.message || 'Gagal memuat roles');
			}
		} catch (e) {
			console.error(e);
			toast.error('Terjadi kesalahan jaringan');
		} finally {
			loading = false;
		}
	}

	onMount(fetchRoles);

	function openAdd() {
		selectedRole = null;
		isFormOpen = true;
	}

	function openEdit(role: any) {
		selectedRole = { ...role };
		isFormOpen = true;
	}

	async function deleteRole(id: string) {
		if (!confirm('Apakah Anda yakin ingin menghapus role ini? Role yang sudah digunakan oleh karyawan tidak bisa dihapus.')) return;
		try {
			const res = await fetch(`${API_URL}/v1/roles/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				toast.success('Role berhasil dihapus');
				fetchRoles();
			} else {
				toast.error(data.error?.message || 'Gagal menghapus role');
			}
		} catch (e) {
			toast.error('Terjadi kesalahan jaringan');
		}
	}

	async function handleSaveRole(data: any) {
		const isEdit = !!data.id;
		const method = isEdit ? 'PUT' : 'POST';
		const url = isEdit ? `${API_URL}/v1/roles/${data.id}` : `${API_URL}/v1/roles`;

		try {
			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({
					name: data.name,
					description: data.description,
					permissions: data.permissions
				})
			});
			const resData = await res.json();
			if (resData.success) {
				toast.success(isEdit ? 'Role berhasil diubah' : 'Role berhasil ditambahkan');
				isFormOpen = false;
				fetchRoles();
			} else {
				toast.error(resData.error?.message || 'Gagal menyimpan role');
			}
		} catch (e) {
			toast.error('Terjadi kesalahan jaringan');
		}
	}
</script>

<svelte:head>
	<title>Hak Akses (Roles) — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader 
		title="Hak Akses (Roles)" 
		subtitle="Kelola kewenangan untuk setiap tipe karyawan" 
	/>

	<main class="p-4 sm:p-6 space-y-6 container-base mt-4 flex-1 max-w-6xl mx-auto w-full">
		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
			<Card.Header class="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-border/50">
				<div>
					<Card.Title class="text-xl font-grotesk font-bold text-ink">Daftar Hak Akses</Card.Title>
					<Card.Description class="text-ink-soft">Buat role baru dengan akses spesifik sesuai kebutuhan.</Card.Description>
				</div>
				<Button onclick={openAdd} variant="cta" class="gap-2 rounded-xl h-10 font-bold shadow-md hover:-translate-y-0.5 transition-all">
					<Plus class="w-4 h-4" />
					<span class="hidden sm:inline">Tambah Role</span>
				</Button>
			</Card.Header>
			<Card.Content class="p-5 sm:p-6">
				{#if loading}
					<LoadingSpinner />
				{:else if roles.length === 0}
					<EmptyState 
						icon={ShieldCheck} 
						title="Belum Ada Custom Role" 
						description="Anda belum membuat custom role. Silakan tambah role baru." 
					/>
				{:else}
					<div class="rounded-2xl border border-border overflow-x-auto">
						<Table.Root>
							<Table.Header class="bg-paper-alt">
								<Table.Row class="border-b-border hover:bg-transparent">
									<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Nama Role</Table.Head>
									<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Deskripsi</Table.Head>
									<Table.Head class="font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Hak Akses</Table.Head>
									<Table.Head class="text-right font-mono text-[11px] uppercase tracking-wider font-bold text-ink-soft">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each roles as role}
									<Table.Row class="border-b-border/60 hover:bg-muted/40 transition-colors">
										<Table.Cell class="font-bold text-ink">{role.name}</Table.Cell>
										<Table.Cell class="text-ink-soft text-sm">{role.description || '-'}</Table.Cell>
										<Table.Cell>
											{#if role.permissions?.includes('*')}
												<span class="inline-flex items-center rounded-full bg-brand-soft/30 px-2.5 py-0.5 text-[11px] font-bold font-mono tracking-wider text-brand">
													Full Access (Semua)
												</span>
											{:else}
												<span class="text-[11px] font-mono font-bold tracking-wider text-ink-soft bg-paper-alt px-2.5 py-0.5 rounded-full border border-border/60">
													{role.permissions?.length || 0} Izin Diberikan
												</span>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-2">
												{#if !['owner', 'admin', 'cashier'].includes(role.name.toLowerCase())}
													<Button variant="ghost" size="icon" class="h-8 w-8 text-brand hover:text-brand hover:bg-brand-soft/30 rounded-lg" onclick={() => openEdit(role)}>
														<Edit class="h-4 w-4" />
													</Button>
													<Button variant="ghost" size="icon" class="h-8 w-8 text-warning-dark hover:text-warning-dark hover:bg-warning-dark/10 rounded-lg" onclick={() => deleteRole(role.id)}>
														<Trash2 class="h-4 w-4" />
													</Button>
												{:else}
													<span class="text-[11px] font-mono font-bold text-ink-faint italic tracking-wider">Sistem (Terkunci)</span>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</main>
</div>

{#if isFormOpen}
	<RoleForm 
		role={selectedRole} 
		onsave={handleSaveRole} 
		oncancel={() => (isFormOpen = false)} 
	/>
{/if}
