<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { authState, logout } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { createQuery } from '@tanstack/svelte-query';
	import { fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { RefreshCcw, Settings, LogOut } from '@lucide/svelte';

	import StatsGrid from '$lib/components/dashboard/StatsGrid.svelte';
	import SalesChart from '$lib/components/dashboard/SalesChart.svelte';
	import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
	import QuickAccess from '$lib/components/dashboard/QuickAccess.svelte';

	import favicon from '$lib/assets/favicon.svg';

	const dashboardQuery = createQuery(() => ({
		queryKey: ['dashboard'],
		queryFn: async () => {
			const res = await fetch(`${API_URL}/v1/reports/dashboard`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			const data = await res.json();
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
		<!-- Welcome -->
		<div class="mb-8">
			<span class="eyebrow mb-3 block">Ringkasan Bisnis</span>
			<h1 class="font-grotesk text-2xl md:text-3xl font-bold text-ink mb-1">
				Halo, <span class="text-cta">Pemilik</span> 👋
			</h1>
			<p class="text-sm text-ink-soft">Pantau performa tokomu hari ini dalam satu layar.</p>
		</div>

		<!-- Stats Grid -->
		<StatsGrid isPending={dashboardQuery.isPending} data={dashboardQuery.data} />

		<!-- Body: Chart + Quick Access -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
	</div>
</main>
