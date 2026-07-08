<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

	let activeTab = $state<'payable' | 'receivable'>('receivable');
	let debts = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function fetchDebts() {
		loading = true;
		try {
			const token = localStorage.getItem('token');
			const res = await fetch(`${API_URL}/v1/debts?type=${activeTab}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const json = await res.json();
			if (json.success) {
				debts = json.data;
			} else {
				error = json.error.message;
			}
		} catch (err) {
			error = 'Gagal mengambil data hutang/piutang';
		} finally {
			loading = false;
		}
	}

	function switchTab(tab: 'payable' | 'receivable') {
		activeTab = tab;
		fetchDebts();
	}

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'Tanpa Batas Waktu';
		return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(dateStr));
	}

	function isOverdue(dateStr: string | null) {
		if (!dateStr) return false;
		return new Date(dateStr).getTime() < new Date().getTime();
	}

	onMount(() => {
		fetchDebts();
	});
</script>

<svelte:head>
	<title>Hutang & Piutang | UMKM Tools</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6 pb-20 p-4">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" href="/">
				←
			</Button>
			<div>
				<h1 class="text-2xl font-bold">Buku Hutang Piutang</h1>
				<p class="text-muted-foreground text-sm mt-1">Catat hutang ke supplier dan piutang dari pelanggan.</p>
			</div>
		</div>
		<Button variant="cta" href="/debts/new">
			+ Catat Baru
		</Button>
	</div>

	<!-- Tabs -->
	<div class="flex border-b">
		<button
			onclick={() => switchTab('receivable')}
			class="px-6 py-3 font-bold text-sm transition border-b-2 {activeTab === 'receivable'
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground'}"
		>
			Piutang (Pelanggan)
		</button>
		<button
			onclick={() => switchTab('payable')}
			class="px-6 py-3 font-bold text-sm transition border-b-2 {activeTab === 'payable'
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground'}"
		>
			Hutang (Supplier)
		</button>
	</div>

	{#if loading}
		<div class="flex justify-center p-12">
			<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
		</div>
	{:else if error}
		<div class="bg-destructive/15 text-destructive p-4 rounded-md border border-destructive/20">
			{error}
		</div>
	{:else if debts.length === 0}
		<Card.Root class="text-center">
			<Card.Content class="p-12 flex flex-col items-center">
				<div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
					<svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
				</div>
				<h3 class="text-lg font-bold mb-2">Belum Ada Data</h3>
				<p class="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
					Anda belum memiliki catatan {activeTab === 'receivable'
						? 'piutang dari pelanggan'
						: 'hutang ke supplier'}.
				</p>
				<Button variant="cta" href="/debts/new" size="sm">
					+ Catat Sekarang
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each debts as debt}
				<a href="/debts/{debt.id}" class="block group">
					<Card.Root class="hover:border-primary transition h-full flex flex-col">
						<Card.Content class="p-5 flex-1 flex flex-col">
							<div class="flex justify-between items-start mb-3">
								<div>
									<h3 class="font-bold text-lg truncate pr-2 group-hover:text-primary transition">
										{debt.entity_name}
									</h3>
									{#if debt.entity_phone}
										<div class="text-xs text-muted-foreground mt-1">{debt.entity_phone}</div>
									{/if}
								</div>
								{#if debt.status === 'unpaid'}
									<Badge variant="destructive" class="whitespace-nowrap">BELUM LUNAS</Badge>
								{:else if debt.status === 'partial'}
									<Badge variant="outline" class="bg-warning-soft text-warning hover:bg-warning-soft border-transparent whitespace-nowrap">CICILAN</Badge>
								{:else if debt.status === 'paid'}
									<Badge variant="outline" class="bg-primary-soft text-primary hover:bg-primary-soft border-transparent whitespace-nowrap">LUNAS</Badge>
								{/if}
							</div>

							<div class="mt-auto space-y-2 pt-2">
								<div class="flex justify-between items-center text-sm">
									<span class="text-muted-foreground">Total Tagihan:</span>
									<span>{formatRupiah(debt.amount)}</span>
								</div>
								<div class="flex justify-between items-center text-sm">
									<span class="text-muted-foreground font-bold">Sisa Tagihan:</span>
									<span class="font-bold {debt.status === 'paid' ? 'text-primary' : 'text-destructive'}">
										{formatRupiah(debt.remaining_amount)}
									</span>
								</div>
							</div>

							<div class="mt-4 pt-3 border-t flex items-center justify-between text-xs">
								<span class="text-muted-foreground">Jatuh Tempo:</span>
								<span class="font-medium {debt.status !== 'paid' && isOverdue(debt.due_date) ? 'text-destructive font-bold' : ''}">
									{formatDate(debt.due_date)}
									{#if debt.status !== 'paid' && isOverdue(debt.due_date)}
										(TERLAMBAT)
									{/if}
								</span>
							</div>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</div>
