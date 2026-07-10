<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let roles = $state<any[]>([]);

	let form = $state({
		name: '',
		phone: '',
		password: '',
		role_id: ''
	});

	let loading = $state(false);

	$effect(() => {
		if (
			authState.user &&
			authState.user.role_name !== 'owner' &&
			authState.user.role_name !== 'admin'
		) {
			goto('/');
		}
	});

	async function fetchRoles() {
		try {
			const data = await apiClient(`/roles`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			if (data.success) {
				roles = data.data;
				if (roles.length > 0) {
					form.role_id = roles[0].id; // default select
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function handleSave() {
		if (!form.name.trim() || !form.phone.trim() || !form.password.trim() || !form.role_id) {
			toast.error('Semua kolom wajib diisi.');
			return;
		}

		loading = true;

		try {
			const data = await apiClient(`/employees`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form)
			});

			if (data.success) {
				toast.success('Karyawan berhasil ditambahkan');
				goto('/employees');
			} else {
				toast.error(data.error?.message || 'Gagal menambahkan karyawan.');
			}
		} catch (e) {
			console.error(e);
			toast.error('Kesalahan jaringan.');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchRoles();
	});
</script>

<svelte:head>
	<title>Tambah Karyawan — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Karyawan Baru" subtitle="Manajemen Karyawan" backHref="/employees" />

	<main class="p-4 sm:p-6 max-w-md mx-auto w-full flex-1">
		<Card.Root class="bg-paper shadow-sm border-border rounded-3xl overflow-hidden">
			<Card.Content class="p-5 sm:p-6 space-y-5">
				<div class="space-y-2">
					<Label for="name" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
						Nama Karyawan <span class="text-cta">*</span>
					</Label>
					<Input
						id="name"
						type="text"
						bind:value={form.name}
						placeholder="Mis. Siti Kasir"
						class="h-12 rounded-xl border-border bg-paper-alt font-medium"
					/>
				</div>

				<div class="space-y-2">
					<Label for="phone" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
						Nomor HP (Login ID) <span class="text-cta">*</span>
					</Label>
					<Input
						id="phone"
						type="tel"
						bind:value={form.phone}
						placeholder="Mis. 08123456789"
						class="h-12 rounded-xl border-border bg-paper-alt font-mono font-medium"
					/>
				</div>

				<div class="space-y-2">
					<Label for="password" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
						Password Sementara <span class="text-cta">*</span>
					</Label>
					<Input
						id="password"
						type="text"
						bind:value={form.password}
						placeholder="Mis. 123456"
						class="h-12 rounded-xl border-border bg-paper-alt font-mono font-medium"
					/>
					<p class="text-[11px] text-ink-faint mt-1">
						Berikan password ini ke karyawan. Mereka dapat mengubahnya nanti.
					</p>
				</div>

				<div class="space-y-2">
					<Label for="role" class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono">
						Hak Akses (Role) <span class="text-cta">*</span>
					</Label>
					<Select.Root
						type="single"
						bind:value={form.role_id}
					>
						<Select.Trigger class="w-full h-12 rounded-xl border-border bg-paper-alt font-medium">
							{#if form.role_id}
								{roles.find((r) => r.id === form.role_id)?.name.toUpperCase()}
							{:else}
								Pilih Hak Akses
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each roles as role}
								<Select.Item value={role.id}>
									{role.name.toUpperCase()} - {role.description}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Button
					variant="cta"
					onclick={handleSave}
					disabled={loading || roles.length === 0}
					class="w-full mt-2 rounded-xl h-12 font-bold shadow-md hover:-translate-y-0.5 transition-all"
				>
					{#if loading}
						<div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></div>
						Menyimpan...
					{:else}
						Buat Akun Karyawan
					{/if}
				</Button>
			</Card.Content>
		</Card.Root>
	</main>
</div>
