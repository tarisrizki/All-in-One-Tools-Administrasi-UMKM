<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Search, Users, Phone, Mail, Plus } from '@lucide/svelte';

	import { hasPermission } from '$lib/stores/auth.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let customers = $state<any[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout>;

	async function fetchCustomers() {
		loading = true;
		try {
			const queryParams = new URLSearchParams();
			if (searchQuery) queryParams.append('search', searchQuery);

			const res = await fetch(`${API_URL}/v1/customers?${queryParams.toString()}`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) customers = data.data;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => fetchCustomers(), 300);
	}

	onMount(() => {
		fetchCustomers();
	});
</script>

<svelte:head>
	<title>Pelanggan — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Pelanggan" subtitle="Database">
		{#snippet actions()}
			{#if hasPermission('customers.write')}
				<Button
					href="/customers/new"
					size="sm"
					class="rounded-full bg-brand hover:bg-brand-dark text-white font-bold shadow-md hover:-translate-y-0.5 transition-all gap-1.5 h-10 px-4"
				>
					<Plus class="w-4 h-4" />
					<span class="hidden sm:inline">Tambah Pelanggan</span>
					<span class="sm:hidden">Tambah</span>
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<main class="p-4 sm:p-6 container-base space-y-5 mt-2 flex-1">
		<!-- Search -->
		<div class="relative">
			<Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
			<Input
				type="text"
				bind:value={searchQuery}
				oninput={handleSearch}
				placeholder="Cari nama, WA, atau email..."
				class="pl-11 h-12 bg-paper border-border rounded-xl focus-visible:ring-brand shadow-sm font-mono text-sm"
			/>
		</div>

		{#if loading}
			<LoadingSpinner message="Memuat data pelanggan..." />
		{:else if customers.length === 0}
			<EmptyState
				icon={Users}
				title="Belum Ada Pelanggan"
				description="Tambahkan data pelanggan pertama Anda."
				actionHref="/customers/new"
				actionLabel="Tambah Pelanggan Baru"
			/>
		{:else}
			<div class="space-y-3">
				{#each customers as customer}
					<Card.Root
						class="hover:border-brand/40 transition-all duration-200 bg-paper shadow-sm border-border rounded-xl overflow-hidden group"
					>
						<Card.Content class="p-4 flex justify-between items-center">
							<div class="min-w-0 flex-1">
								<h3 class="font-bold text-ink text-base font-grotesk tracking-tight truncate">
									{customer.name}
								</h3>
								{#if customer.phone}
									<p class="text-xs font-mono text-ink-soft flex items-center gap-1.5 mt-1.5">
										<Phone class="w-3 h-3 shrink-0" />
										{customer.phone}
									</p>
								{/if}
								{#if customer.email}
									<p class="text-[10px] font-mono text-ink-soft mt-1 flex items-center gap-1.5">
										<Mail class="w-3 h-3 shrink-0" />
										{customer.email}
									</p>
								{/if}
							</div>
							<div class="flex flex-col gap-2 items-end ml-3 shrink-0">
								<div class="flex items-center gap-1.5">
									<Badge
										variant="secondary"
										class="font-mono font-bold tracking-widest text-[10px] bg-brand/10 text-brand border-none shadow-none px-2 rounded-md"
									>
										{customer.loyaltyPoints} POIN
									</Badge>
									{#if customer.tier}
										<Badge
											variant="secondary"
											class="font-mono font-bold tracking-widest text-[10px] {customer.tier === 'Gold' ? 'bg-amber-100 text-amber-700' : customer.tier === 'Silver' ? 'bg-slate-200 text-slate-700' : 'bg-surface-300 text-ink-soft'} border-none shadow-none px-2 rounded-md"
										>
											{customer.tier.toUpperCase()}
										</Badge>
									{/if}
								</div>
								{#if customer.phone}
									<a
										href="https://wa.me/{customer.phone.replace(/[^0-9]/g, '')}"
										target="_blank"
										rel="noopener noreferrer"
										class="text-cta text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 hover:underline font-mono bg-cta/10 px-2 py-0.5 rounded-md transition-colors hover:bg-cta hover:text-white"
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
