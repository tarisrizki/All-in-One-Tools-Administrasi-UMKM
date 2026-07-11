<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { authState, logout } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { createQuery } from '@tanstack/svelte-query';
	import { fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { RefreshCcw, Settings, LogOut, ShoppingCart, Package, Wallet, BarChart3 } from '@lucide/svelte';

	import { appModeState } from '$lib/stores/appMode.svelte';

	import StatsGrid from '$lib/components/dashboard/StatsGrid.svelte';
	import SalesChart from '$lib/components/dashboard/SalesChart.svelte';
	import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
	import QuickAccess from '$lib/components/dashboard/QuickAccess.svelte';
	import ActionTile from '$lib/components/dashboard/ActionTile.svelte';

	import favicon from '$lib/assets/favicon.svg';

	const dashboardQuery = createQuery(() => ({
		queryKey: ['dashboard'],
		queryFn: async () => {
			const data = await apiClient(`/reports/dashboard`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			if (data.success) return data.data;
			throw new Error(data.message || 'Failed to fetch dashboard');
		},
		enabled: !!authState.token,
		staleTime: 60_000
	}));

	function handleLogout() {
		logout();
		goto('/auth/login');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Dashboard — Beres UMKM</title>
</svelte:head>

<!-- ===== NAVBAR ===== -->
<header class="sticky top-0 z-30 bg-paper/90 backdrop-blur-md border-b border-border">
	<div class="container-base h-16 flex items-center justify-between">
		<!-- Brand: hanya tampil di mobile, sidebar sudah menampilkannya di desktop -->
		<a href="/dashboard" class="flex items-center gap-2.5 group min-h-0 lg:hidden">
			<div
				class="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-bold font-grotesk text-base -rotate-6 shadow-sm group-hover:rotate-0 transition-transform"
			>
				B
			</div>
			<span class="font-grotesk font-bold text-xl tracking-tight text-brand">Beres</span>
		</a>
		<div class="hidden lg:block">
			<span class="font-grotesk font-bold text-lg tracking-tight text-ink">Dashboard</span>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-2">
			<Button
				variant="ghost"
				size="icon"
				class="text-ink-soft hover:text-brand rounded-xl"
				onclick={() => dashboardQuery.refetch()}
				disabled={dashboardQuery.isRefetching}
				aria-label="Refresh"
			>
				<RefreshCcw class="w-4 h-4 {dashboardQuery.isRefetching ? 'animate-spin' : ''}" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				href="/settings"
				class="text-ink-soft hover:text-brand rounded-xl hidden sm:flex"
			>
				<Settings class="w-4 h-4" />
			</Button>
			<Separator orientation="vertical" class="h-6 mx-1 lg:hidden" />
			<Button
				variant="ghost"
				size="sm"
				class="text-danger hover:bg-danger-soft font-bold gap-2 rounded-xl lg:hidden"
				onclick={handleLogout}
			>
				<LogOut class="w-4 h-4" />
				<span class="hidden sm:inline">Keluar</span>
			</Button>
		</div>
	</div>
</header>

<!-- ===== MAIN CONTENT ===== -->
<main class="container-base py-6 md:py-10">
	<div class="max-w-5xl mx-auto" in:fly={{ y: 16, duration: 400 }}>
	<div class="max-w-5xl mx-auto" in:fly={{ y: 16, duration: 400 }}>
		<!-- Welcome -->
		<div class="mb-8">
			<span class="eyebrow mb-3 block">Ringkasan Bisnis</span>
			<h1 class="font-grotesk text-2xl md:text-3xl font-bold text-ink mb-1">
				Halo, <span class="text-cta">Pemilik</span> 👋
			</h1>
			{#if appModeState.mode === 'simple'}
				<p class="font-grotesk font-bold text-2xl text-ink mt-2">
					{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
				</p>
			{:else}
				<p class="text-sm text-ink-soft">Pantau performa tokomu hari ini dalam satu layar.</p>
			{/if}
		</div>

		{#if appModeState.mode === 'simple'}
			<div class="flex flex-col gap-4">
				<div class="bg-gradient-to-br from-brand to-[#3d4499] rounded-[22px] p-[22px] text-white">
					<div class="font-sans text-[13px] opacity-85">Omzet hari ini</div>
					<div class="font-grotesk font-extrabold text-[32px] md:text-[38px] mt-0.5">
						{dashboardQuery.isPending ? '...' : (dashboardQuery.data?.todaySales ? 'Rp ' + dashboardQuery.data.todaySales.toLocaleString('id-ID') : 'Rp 0')}
					</div>
					<div class="font-sans text-[12.5px] opacity-80 mt-1">
						{dashboardQuery.isPending ? '...' : (dashboardQuery.data?.todayCount || 0)} transaksi hari ini
					</div>
				</div>

				<ActionTile 
					icon={ShoppingCart} 
					label="Buka Kasir" 
					sub="Mulai jualan sekarang" 
					colorClass="text-cta" 
					bgClass="bg-cta-soft" 
					size="lg" 
					href="/pos" 
				/>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<ActionTile icon={Package} label="Produk & Stok" sub="Kelola inventaris" colorClass="text-brand" bgClass="bg-brand-soft" href="/products" />
					<ActionTile icon={Wallet} label="Buku Kas" sub="Catat masuk/keluar" colorClass="text-success" bgClass="bg-success-soft" href="/cashbook" />
					<ActionTile icon={BarChart3} label="Ringkasan" sub="Lihat laporan" colorClass="text-warning" bgClass="bg-warning-soft" href="/reports" />
				</div>
			</div>
		{:else}
			<!-- Stats Grid for Full Mode -->
			<StatsGrid isPending={dashboardQuery.isPending} data={dashboardQuery.data} />

			<!-- Body: Chart + Quick Access -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
				<!-- LEFT: Chart & Activity -->
				<div class="lg:col-span-2 space-y-6">
					<SalesChart
						isPending={dashboardQuery.isPending}
						weeklyData={dashboardQuery.data?.weeklyData}
					/>
					<Separator />
					<RecentActivity
						isPending={dashboardQuery.isPending}
						transactions={dashboardQuery.data?.recentTransactions}
					/>
				</div>

				<!-- RIGHT: Quick Access -->
				<QuickAccess />
			</div>
		{/if}
	</div>
	</div>
</main>
