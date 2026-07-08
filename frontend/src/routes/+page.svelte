<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { RefreshCcw, ShoppingCart, Package, Users, Calculator, LineChart, Handshake } from 'lucide-svelte';

	let dashboard = $state<any>(null);
	let loading = $state(true);

	async function fetchDashboard() {
		if (!authState.token) return;
		loading = true;
		try {
			const res = await fetch(`${API_URL}/v1/reports/dashboard`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
			if (data.success) {
				dashboard = data.data;
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchDashboard();
	});

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDateShort(dateStr: string) {
		const date = new Date(dateStr);
		return `${date.getDate()}/${date.getMonth() + 1}`;
	}

	// Hitung persentase untuk bar chart (relatif terhadap penjualan tertinggi minggu ini)
	let maxWeekly = $derived(
		dashboard && dashboard.weeklyData && dashboard.weeklyData.length > 0
			? Math.max(...dashboard.weeklyData.map((d: any) => d.total))
			: 1
	); // fallback 1 to avoid div by zero
</script>

<svelte:head>
	<title>Beranda | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<!-- Header -->
	<header class="bg-background px-4 py-6 border-b flex justify-between items-center">
		<div>
			<h1 class="text-xl font-bold">
				Halo, {authState.user?.businessId ? 'Pemilik Toko' : 'Kasir'} 👋
			</h1>
			<p class="text-muted-foreground text-sm mt-1">Siap untuk jualan hari ini?</p>
		</div>
		<!-- Refresh button -->
		<Button
			variant="outline"
			size="icon"
			onclick={fetchDashboard}
			disabled={loading}
			aria-label="Refresh Data"
		>
			<RefreshCcw class="w-5 h-5 {loading ? 'animate-spin' : ''}" />
		</Button>
	</header>

	<!-- Main Content -->
	<main class="p-4 space-y-6 max-w-5xl mx-auto mt-2">
		<!-- Dashboard Widget (Penjualan Hari Ini) -->
		<Card.Root class="bg-primary text-primary-foreground border-none overflow-hidden relative">
			<Card.Content class="p-5 relative z-10">
				<p class="text-sm font-medium opacity-90 mb-1">Penjualan Hari Ini</p>
				{#if loading}
					<div class="h-10 w-48 bg-primary-foreground/20 rounded animate-pulse mb-2"></div>
				{:else}
					<h2 class="text-3xl font-bold" transition:fade>
						{formatRupiah(dashboard?.todaySales || 0)}
					</h2>
					<p class="text-xs mt-2 opacity-90 font-medium">
						{dashboard?.todayTransactions || 0} transaksi selesai
					</p>
				{/if}
			</Card.Content>
			<!-- Decorative circle -->
			<div class="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full"></div>
			<div class="absolute right-12 -bottom-8 w-16 h-16 bg-white opacity-10 rounded-full"></div>
		</Card.Root>

		<!-- Grafik Tren Penjualan 7 Hari Terakhir (HTML/CSS Based) -->
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm uppercase tracking-wider text-muted-foreground">Tren Penjualan (7 Hari Terakhir)</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if loading}
					<div class="h-32 flex items-end justify-between gap-2 px-2 animate-pulse">
						{#each Array(7) as _}
							<div class="w-full bg-muted rounded-t-md h-[40%]"></div>
						{/each}
					</div>
				{:else if dashboard?.weeklyData?.length > 0}
					<div class="h-32 flex items-end justify-between gap-1 sm:gap-2 px-1 relative pb-6 border-b">
						{#each dashboard.weeklyData as day}
							<!-- Bar Container -->
							<div class="relative flex flex-col justify-end w-full h-full group">
								<!-- Tooltip (muncul saat hover) -->
								<div
									class="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-md"
								>
									{formatRupiah(day.total)}
								</div>
								<!-- Bar fill -->
								<div
									class="w-full bg-primary/60 hover:bg-primary transition-colors rounded-t-sm"
									style="height: {day.total === 0 ? '4px' : (day.total / maxWeekly) * 100}%;"
								></div>
								<!-- X-Axis Label -->
								<div
									class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground font-mono"
								>
									{formatDateShort(day.date)}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="h-32 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md bg-muted/20"
					>
						Belum ada data penjualan 7 hari terakhir.
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Quick Actions -->
		<section>
			<h3 class="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground px-1">Menu Cepat</h3>
			<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
				<Button
					variant="cta"
					class="h-auto py-4 flex-col gap-3"
					href="/pos"
				>
					<div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center transition-colors">
						<ShoppingCart class="w-6 h-6 text-white" />
					</div>
					<span class="font-bold text-sm text-white">Buka Kasir</span>
				</Button>

				<Button
					variant="outline"
					class="h-auto py-4 flex-col gap-3"
					href="/products"
				>
					<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center transition-colors">
						<Package class="w-6 h-6" />
					</div>
					<span class="font-medium text-sm text-wrap leading-tight">Stok Barang</span>
				</Button>

				{#if authState.user?.role_name === 'owner' || authState.user?.role_name === 'admin'}
					<Button
						variant="outline"
						class="h-auto py-4 flex-col gap-3"
						href="/debts"
					>
						<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center transition-colors">
							<Handshake class="w-6 h-6" />
						</div>
						<span class="font-medium text-sm text-wrap leading-tight">Hutang Piutang</span>
					</Button>

					<Button
						variant="outline"
						class="h-auto py-4 flex-col gap-3"
						href="/reports"
					>
						<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center transition-colors">
							<LineChart class="w-6 h-6" />
						</div>
						<span class="font-medium text-sm text-wrap leading-tight">Laporan</span>
					</Button>
				{/if}

				<Button
					variant="outline"
					class="h-auto py-4 flex-col gap-3"
					href="/customers"
				>
					<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center transition-colors">
						<Users class="w-6 h-6" />
					</div>
					<span class="font-medium text-sm text-wrap leading-tight">Pelanggan</span>
				</Button>

				<Button
					variant="outline"
					class="h-auto py-4 flex-col gap-3"
					href="/calculator"
				>
					<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center transition-colors">
						<Calculator class="w-6 h-6" />
					</div>
					<span class="font-medium text-sm text-wrap leading-tight">Kalkulator</span>
				</Button>

				{#if authState.user?.role_name === 'owner' || authState.user?.role_name === 'admin'}
					<Button
						variant="outline"
						class="h-auto py-4 flex-col gap-3"
						href="/employees"
					>
						<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center transition-colors text-2xl">
							👨‍💼
						</div>
						<span class="font-medium text-sm text-wrap leading-tight">Karyawan</span>
					</Button>
				{/if}
			</div>
		</section>
	</main>
</div>
