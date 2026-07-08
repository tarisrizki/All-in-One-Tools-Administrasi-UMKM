<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	let customers = $state<any[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let searchTimeout: any;

	async function fetchCustomers() {
		loading = true;
		try {
			const queryParams = new URLSearchParams();
			if (searchQuery) queryParams.append('search', searchQuery);

			const res = await fetch(`${API_URL}/v1/customers?${queryParams.toString()}`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				customers = data.data;
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			fetchCustomers();
		}, 300);
	}

	onMount(() => {
		fetchCustomers();
	});
</script>

<svelte:head>
	<title>Database Pelanggan | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex justify-between items-center sticky top-0 z-10">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" href="/">
				←
			</Button>
			<h1 class="text-lg font-bold">Pelanggan</h1>
		</div>
		<Button href="/customers/new" size="sm">
			+ Tambah
		</Button>
	</header>

	<main class="p-4 max-w-xl mx-auto space-y-4 mt-2">
		<div class="relative">
			<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
			<Input
				type="text"
				bind:value={searchQuery}
				oninput={handleSearch}
				placeholder="Cari nama, WA, atau email..."
				class="pl-10 bg-background"
			/>
		</div>

		{#if loading}
			<div class="flex justify-center p-8">
				<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else if customers.length === 0}
			<Card.Root class="text-center shadow-sm">
				<Card.Content class="p-8 flex flex-col items-center">
					<div class="text-4xl mb-3">👥</div>
					<p class="font-bold mb-1">Belum Ada Pelanggan</p>
					<p class="text-muted-foreground text-sm mb-4">Tambahkan data pelanggan pertama Anda.</p>
					<Button href="/customers/new">
						Tambah Pelanggan Baru
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-3">
				{#each customers as customer}
					<Card.Root class="hover:border-primary transition-colors">
						<Card.Content class="p-4 flex justify-between items-center">
							<div>
								<h3 class="font-bold">{customer.name}</h3>
								{#if customer.phone}
									<p class="text-sm text-muted-foreground flex items-center gap-1 mt-1">
										<span class="text-xs">📱</span>
										{customer.phone}
									</p>
								{/if}
								{#if customer.email}
									<p class="text-xs text-muted-foreground mt-1">✉️ {customer.email}</p>
								{/if}
							</div>
							<div class="flex flex-col gap-2 items-end">
								<Badge variant="secondary" class="bg-primary/10 text-primary hover:bg-primary/20">
									{customer.loyalty_points} Poin
								</Badge>
								{#if customer.phone}
									<a
										href="https://wa.me/{customer.phone.replace(/[^0-9]/g, '')}"
										target="_blank"
										rel="noopener noreferrer"
										class="text-green-600 text-xs font-bold flex items-center gap-1 hover:underline"
									>
										Hubungi WA
									</a>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</main>
</div>
