<script lang="ts">
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
			const res = await fetch(`${API_URL}/v1/roles`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
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
			const res = await fetch(`${API_URL}/v1/employees`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authState.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form)
			});
			const data = await res.json();

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
	<title>Tambah Karyawan | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
		<Button variant="ghost" size="icon" href="/employees">
			←
		</Button>
		<h1 class="text-lg font-bold">Karyawan Baru</h1>
	</header>

	<main class="p-4 max-w-md mx-auto space-y-4 mt-2">
		<Card.Root>
			<Card.Content class="p-5 space-y-4">
				<div class="space-y-2">
					<Label for="name">
						Nama Karyawan <span class="text-destructive">*</span>
					</Label>
					<Input
						id="name"
						type="text"
						bind:value={form.name}
						placeholder="Mis. Siti Kasir"
					/>
				</div>

				<div class="space-y-2">
					<Label for="phone">
						Nomor HP (Login ID) <span class="text-destructive">*</span>
					</Label>
					<Input
						id="phone"
						type="tel"
						bind:value={form.phone}
						placeholder="Mis. 08123456789"
					/>
				</div>

				<div class="space-y-2">
					<Label for="password">
						Password Sementara <span class="text-destructive">*</span>
					</Label>
					<Input
						id="password"
						type="text"
						bind:value={form.password}
						placeholder="Mis. 123456"
					/>
					<p class="text-[10px] text-muted-foreground mt-1">
						Berikan password ini ke karyawan. Mereka dapat mengubahnya nanti.
					</p>
				</div>

				<div class="space-y-2">
					<Label for="role">
						Hak Akses (Role) <span class="text-destructive">*</span>
					</Label>
					<Select.Root
						type="single"
						bind:value={form.role_id}
					>
						<Select.Trigger class="w-full">
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
					class="w-full mt-4"
				>
					{#if loading}
						<div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
						Menyimpan...
					{:else}
						Buat Akun Karyawan
					{/if}
				</Button>
			</Card.Content>
		</Card.Root>
	</main>
</div>
