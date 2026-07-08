<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft } from 'lucide-svelte';

	let activeMode = $state<'margin' | 'bep' | 'roi'>('margin');

	// State for Margin/Harga Jual
	let hargaModal = $state<number | undefined>();
	let targetMargin = $state<number | undefined>();

	let hargaJual = $derived(() => {
		if (!hargaModal || !targetMargin) return 0;
		// Rumus Markup = Modal + (Modal * Margin%)
		return hargaModal + (hargaModal * targetMargin) / 100;
	});

	let profitPerItem = $derived(() => {
		if (!hargaModal || !targetMargin) return 0;
		return (hargaModal * targetMargin) / 100;
	});

	// State for BEP
	let biayaTetap = $state<number | undefined>(); // Fixed costs (sewa, gaji)
	let hargaJualUnit = $state<number | undefined>();
	let biayaVariabel = $state<number | undefined>(); // HPP / bahan per unit

	let bepUnit = $derived(() => {
		if (!biayaTetap || !hargaJualUnit || !biayaVariabel || hargaJualUnit <= biayaVariabel) return 0;
		return Math.ceil(biayaTetap / (hargaJualUnit - biayaVariabel));
	});

	let bepRupiah = $derived(() => {
		return bepUnit() * (hargaJualUnit || 0);
	});

	// State for ROI
	let modalAwal = $state<number | undefined>();
	let untungBersih = $state<number | undefined>();

	let roi = $derived(() => {
		if (!modalAwal || !untungBersih) return 0;
		return (untungBersih / modalAwal) * 100;
	});

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<svelte:head>
	<title>Kalkulator Bisnis | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
		<Button variant="ghost" size="icon" href="/">
			<ArrowLeft class="w-5 h-5" />
		</Button>
		<h1 class="text-lg font-bold">Kalkulator Bisnis</h1>
	</header>

	<!-- Tabs -->
	<div class="flex border-b bg-background overflow-x-auto whitespace-nowrap hide-scrollbar">
		<button
			onclick={() => (activeMode = 'margin')}
			class="px-4 py-3 font-bold text-sm transition border-b-2 {activeMode === 'margin'
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground'}"
		>
			Harga Jual & Margin
		</button>
		<button
			onclick={() => (activeMode = 'bep')}
			class="px-4 py-3 font-bold text-sm transition border-b-2 {activeMode === 'bep'
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground'}"
		>
			Titik Impas (BEP)
		</button>
		<button
			onclick={() => (activeMode = 'roi')}
			class="px-4 py-3 font-bold text-sm transition border-b-2 {activeMode === 'roi'
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground'}"
		>
			ROI (Balik Modal)
		</button>
	</div>

	<main class="p-4 max-w-md mx-auto mt-4">
		{#if activeMode === 'margin'}
			<Card.Root>
				<Card.Content class="pt-6 space-y-4">
					<p class="text-sm text-muted-foreground mb-4">
						Hitung harga jual ideal barang Anda berdasarkan target keuntungan.
					</p>

					<div class="space-y-2">
						<Label>Harga Modal (HPP)</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
							<Input
								type="number"
								bind:value={hargaModal}
								class="pl-9"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label>Target Margin / Keuntungan</Label>
						<div class="relative">
							<Input
								type="number"
								bind:value={targetMargin}
								class="pr-8"
								placeholder="0"
							/>
							<span class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
						</div>
					</div>

					<div class="mt-6 pt-6 border-t border-dashed">
						<p class="text-sm text-muted-foreground font-bold uppercase mb-2">Hasil Perhitungan</p>
						<div class="bg-primary/10 p-4 rounded-md border border-primary/20">
							<p class="text-xs text-primary font-bold mb-1">HARGA JUAL IDEAL</p>
							<p class="text-3xl font-bold text-primary mb-3">{formatRupiah(hargaJual())}</p>

							<div class="flex justify-between text-sm pt-2 border-t border-primary/10">
								<span class="text-muted-foreground">Laba Bersih per item</span>
								<span class="font-bold text-primary">+{formatRupiah(profitPerItem())}</span>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if activeMode === 'bep'}
			<Card.Root>
				<Card.Content class="pt-6 space-y-4">
					<p class="text-sm text-muted-foreground mb-4">
						Ketahui berapa banyak produk yang harus terjual agar tidak rugi (balik modal operasional).
					</p>

					<div class="space-y-2">
						<Label>Biaya Tetap (Per Bulan)</Label>
						<p class="text-xs text-muted-foreground mb-1">Misal: Sewa, Gaji, Listrik</p>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
							<Input
								type="number"
								bind:value={biayaTetap}
								class="pl-9"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label>Harga Jual (Per Unit)</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
							<Input
								type="number"
								bind:value={hargaJualUnit}
								class="pl-9"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label>Biaya Variabel / Modal (Per Unit)</Label>
						<p class="text-xs text-muted-foreground mb-1">HPP atau bahan baku per produk</p>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
							<Input
								type="number"
								bind:value={biayaVariabel}
								class="pl-9"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="mt-6 pt-6 border-t border-dashed">
						<p class="text-sm text-muted-foreground font-bold uppercase mb-2">Hasil BEP</p>
						{#if hargaJualUnit && biayaVariabel && hargaJualUnit <= biayaVariabel}
							<div class="bg-destructive/10 text-destructive p-3 rounded-md text-sm font-medium border border-destructive/20">
								⚠️ Harga jual tidak boleh lebih kecil atau sama dengan biaya variabel. Anda akan
								selalu rugi.
							</div>
						{:else}
							<div
								class="bg-muted p-4 rounded-md border flex flex-col items-center text-center"
							>
								<p class="text-xs text-muted-foreground font-medium mb-1">TARGET PENJUALAN MINIMAL</p>
								<p class="text-4xl font-bold mb-2">
									{bepUnit()} <span class="text-lg text-muted-foreground">Unit</span>
								</p>
								<p class="text-sm text-muted-foreground">
									Atau setara dengan omzet <span class="font-bold">{formatRupiah(bepRupiah())}</span>
								</p>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if activeMode === 'roi'}
			<Card.Root>
				<Card.Content class="pt-6 space-y-4">
					<p class="text-sm text-muted-foreground mb-4">
						Ukur persentase pengembalian modal dari keuntungan yang didapat.
					</p>

					<div class="space-y-2">
						<Label>Total Modal Investasi</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
							<Input
								type="number"
								bind:value={modalAwal}
								class="pl-9"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label>Keuntungan Bersih (Total Laba)</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
							<Input
								type="number"
								bind:value={untungBersih}
								class="pl-9"
								placeholder="0"
							/>
						</div>
					</div>

					<div class="mt-6 pt-6 border-t border-dashed">
						<p class="text-sm text-muted-foreground font-bold uppercase mb-2">Hasil ROI</p>
						<div
							class="bg-muted p-4 rounded-md border flex flex-col items-center text-center"
						>
							<p class="text-xs text-muted-foreground font-medium mb-1">PERSENTASE BALIK MODAL</p>
							<p class="text-4xl font-bold {roi() >= 100 ? 'text-primary' : 'text-primary'} mb-2">
								{roi().toFixed(2)} %
							</p>
							<p class="text-sm text-muted-foreground">
								{#if roi() >= 100}
									🎉 Selamat! Modal Anda sudah kembali sepenuhnya.
								{:else if roi() > 0}
									Sedikit lagi modal akan kembali seutuhnya.
								{:else}
									Belum ada pengembalian modal.
								{/if}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</main>
</div>

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
