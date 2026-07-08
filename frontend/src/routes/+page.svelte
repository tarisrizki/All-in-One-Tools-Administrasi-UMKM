<script lang="ts">
	// Dashboard — Mode Sederhana (DESIGN.MD §3)
	// Sprint S0: Design token showcase + placeholder dashboard

	let penjualanHariIni = $state('Rp0');
	let stokRendah = $state(0);
	let isOnline = $state(true);

	// Simulasi data untuk demo design tokens
	$effect(() => {
		penjualanHariIni = 'Rp842.000';
		stokRendah = 3;
	});
</script>

<!-- Topbar -->
<header
	class="sticky top-0 z-40 flex items-center justify-between bg-surface-card px-spacing-4 py-spacing-3 shadow-sm border-b border-border"
>
	<div class="flex items-center gap-spacing-3">
		<button class="flex items-center justify-center w-12 h-12 rounded-md" aria-label="Menu">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line
					x1="3"
					y1="18"
					x2="21"
					y2="18"
				/></svg
			>
		</button>
		<h1 class="text-h2 text-ink">Toko Berkah</h1>
	</div>
	{#if isOnline}
		<span class="badge-online">
			<span class="w-2 h-2 rounded-full bg-primary"></span>
			Online
		</span>
	{:else}
		<span class="badge-offline">
			<span class="w-2 h-2 rounded-full bg-warning"></span>
			Offline
		</span>
	{/if}
</header>

<!-- Main Content -->
<main class="max-w-md mx-auto px-spacing-4 py-spacing-6 space-y-spacing-6">
	<!-- Ringkasan Penjualan -->
	<section class="grid grid-cols-2 gap-spacing-3">
		<div class="card col-span-1">
			<p class="text-body-sm text-ink-soft mb-spacing-1">Penjualan hari ini</p>
			<p class="text-money-lg text-ink">{penjualanHariIni}</p>
		</div>
		<div class="card col-span-1 cursor-pointer hover:shadow-md transition-shadow">
			<p class="text-body-sm text-ink-soft mb-spacing-1">Stok menipis</p>
			<div class="flex items-center gap-spacing-2">
				<p class="text-h1 text-ink font-bold">{stokRendah}</p>
				<span class="badge-low-stock">produk</span>
			</div>
		</div>
	</section>

	<!-- Tombol Aksi Cepat (3 tombol besar — Mode Sederhana §3) -->
	<section class="grid grid-cols-3 gap-spacing-3">
		<a
			href="/kasir"
			class="btn-primary flex-col gap-spacing-1 py-spacing-4 rounded-md text-center no-underline"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="currentColor"
				><path
					d="M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 16h16v4H4z"
				/></svg
			>
			<span class="text-body-sm font-bold">Kasir</span>
		</a>
		<a
			href="/produk"
			class="btn-secondary flex-col gap-spacing-1 py-spacing-4 rounded-md text-center no-underline"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="currentColor"
				><path
					d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4z"
				/></svg
			>
			<span class="text-body-sm font-bold">Produk</span>
		</a>
		<a
			href="/kas"
			class="btn-secondary flex-col gap-spacing-1 py-spacing-4 rounded-md text-center no-underline"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="currentColor"
				><path
					d="M21 18v1c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
				/></svg
			>
			<span class="text-body-sm font-bold">Buku Kas</span>
		</a>
	</section>

	<!-- Aktivitas Terbaru -->
	<section>
		<h2 class="text-h2 text-ink mb-spacing-3">Aktivitas terbaru</h2>
		<div class="card space-y-0">
			<div
				class="flex items-center justify-between py-spacing-3 px-spacing-2 border-b border-border"
			>
				<div>
					<p class="text-body text-ink font-medium">Penjualan #1123</p>
					<p class="text-body-sm text-ink-soft">Hari ini, 14:23</p>
				</div>
				<p class="text-money text-primary">+Rp53.000</p>
			</div>
			<div
				class="flex items-center justify-between py-spacing-3 px-spacing-2 border-b border-border"
			>
				<div>
					<p class="text-body text-ink font-medium">Penjualan #1122</p>
					<p class="text-body-sm text-ink-soft">Hari ini, 13:45</p>
				</div>
				<p class="text-money text-primary">+Rp28.000</p>
			</div>
			<div class="flex items-center justify-between py-spacing-3 px-spacing-2">
				<div>
					<p class="text-body text-ink font-medium">Pengeluaran — Listrik</p>
					<p class="text-body-sm text-ink-soft">Hari ini, 09:00</p>
				</div>
				<p class="text-money text-danger">-Rp120.000</p>
			</div>
		</div>
	</section>

	<!-- Design System Test — Color Palette -->
	<section>
		<h2 class="text-h2 text-ink mb-spacing-3">Design System</h2>
		<div class="card">
			<p class="text-body-sm text-ink-soft mb-spacing-3">Color Tokens (DESIGN.MD §4)</p>
			<div class="grid grid-cols-4 gap-spacing-2">
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-primary"></div>
					<span class="text-body-sm text-ink-soft">primary</span>
				</div>
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-accent"></div>
					<span class="text-body-sm text-ink-soft">accent</span>
				</div>
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-warning"></div>
					<span class="text-body-sm text-ink-soft">warning</span>
				</div>
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-danger"></div>
					<span class="text-body-sm text-ink-soft">danger</span>
				</div>
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-info"></div>
					<span class="text-body-sm text-ink-soft">info</span>
				</div>
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-ink"></div>
					<span class="text-body-sm text-ink-soft">ink</span>
				</div>
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-surface border border-border"></div>
					<span class="text-body-sm text-ink-soft">surface</span>
				</div>
				<div class="flex flex-col items-center gap-1">
					<div class="w-10 h-10 rounded-md bg-surface-card border border-border"></div>
					<span class="text-body-sm text-ink-soft">card</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Component Showcase -->
	<section>
		<h2 class="text-h2 text-ink mb-spacing-3">Komponen</h2>
		<div class="space-y-spacing-3">
			<button class="btn-primary btn-primary-lg w-full">Bayar · Rp53.000</button>
			<button class="btn-secondary w-full">Tombol Sekunder</button>
			<button class="btn-danger w-full">Hapus Transaksi</button>
			<input class="input-field" placeholder="Cari produk..." />
			<div class="flex gap-spacing-2 flex-wrap">
				<span class="badge-online"
					><span class="w-2 h-2 rounded-full bg-primary"></span> Online</span
				>
				<span class="badge-offline"
					><span class="w-2 h-2 rounded-full bg-warning"></span> Offline</span
				>
				<span class="badge-syncing"
					><span class="w-2 h-2 rounded-full bg-info"></span> Sinkronisasi</span
				>
				<span class="badge-low-stock">Stok rendah</span>
			</div>
		</div>
	</section>
</main>

<!-- Bottom Navigation (Mode Sederhana — 3 item, §10) -->
<nav class="fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-border safe-bottom">
	<div class="max-w-md mx-auto flex justify-around items-center py-spacing-2">
		<a
			href="/"
			class="flex flex-col items-center gap-1 py-spacing-1 px-spacing-3 text-primary no-underline min-w-0"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg
			>
			<span class="text-body-sm font-bold">Beranda</span>
		</a>
		<a
			href="/kasir"
			class="flex flex-col items-center gap-1 py-spacing-1 px-spacing-3 text-ink-soft no-underline min-w-0"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="currentColor"
				><path
					d="M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 16h16v4H4z"
				/></svg
			>
			<span class="text-body-sm">Kasir</span>
		</a>
		<a
			href="/pengaturan"
			class="flex flex-col items-center gap-1 py-spacing-1 px-spacing-3 text-ink-soft no-underline min-w-0"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="currentColor"
				><path
					d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
				/></svg
			>
			<span class="text-body-sm">Pengaturan</span>
		</a>
	</div>
</nav>

<!-- Spacing for bottom nav -->
<div class="h-20"></div>
