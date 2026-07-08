<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { formatRupiah } from '$lib/utils/format';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import TabBar from '$lib/components/TabBar.svelte';

	let activeMode = $state<'margin' | 'bep' | 'roi'>('margin');

	// State for Margin/Harga Jual
	let hargaModal = $state<number | undefined>();
	let targetMargin = $state<number | undefined>();

	let hargaJual = $derived(() => {
		if (!hargaModal || !targetMargin) return 0;
		return hargaModal + (hargaModal * targetMargin) / 100;
	});
	let profitPerItem = $derived(() => {
		if (!hargaModal || !targetMargin) return 0;
		return (hargaModal * targetMargin) / 100;
	});

	// State for BEP
	let biayaTetap = $state<number | undefined>();
	let hargaJualUnit = $state<number | undefined>();
	let biayaVariabel = $state<number | undefined>();

	let bepUnit = $derived(() => {
		if (!biayaTetap || !hargaJualUnit || !biayaVariabel || hargaJualUnit <= biayaVariabel) return 0;
		return Math.ceil(biayaTetap / (hargaJualUnit - biayaVariabel));
	});
	let bepRupiah = $derived(() => bepUnit() * (hargaJualUnit || 0));

	// State for ROI
	let modalAwal = $state<number | undefined>();
	let untungBersih = $state<number | undefined>();
	let roi = $derived(() => {
		if (!modalAwal || !untungBersih) return 0;
		return (untungBersih / modalAwal) * 100;
	});

	const tabs = [
		{ key: 'margin', label: 'Harga Jual & Margin' },
		{ key: 'bep', label: 'Titik Impas (BEP)' },
		{ key: 'roi', label: 'ROI (Balik Modal)' }
	];
</script>

<svelte:head>
	<title>Kalkulator Bisnis — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Kalkulator Bisnis" subtitle="Analisis Keuangan" />
	<TabBar {tabs} active={activeMode} onSelect={(k) => (activeMode = k as typeof activeMode)} />

	<main class="p-4 max-w-md mx-auto w-full mt-4 flex-1">
		{#if activeMode === 'margin'}
			<Card.Root class="bg-paper shadow-sm border-border rounded-2xl">
				<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
					<Card.Title class="font-grotesk text-ink text-lg">Harga Jual & Margin</Card.Title>
					<Card.Description class="text-ink-soft text-sm">
						Hitung harga jual ideal berdasarkan target keuntungan.
					</Card.Description>
				</Card.Header>
				<Card.Content class="pt-6 space-y-4">
					<div class="space-y-2">
						<Label class="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Harga Modal (HPP)</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono font-bold">Rp</span>
							<Input type="number" bind:value={hargaModal} class="pl-10 font-mono" placeholder="0" />
						</div>
					</div>
					<div class="space-y-2">
						<Label class="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Target Margin / Keuntungan</Label>
						<div class="relative">
							<Input type="number" bind:value={targetMargin} class="pr-10 font-mono" placeholder="0" />
							<span class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono font-bold">%</span>
						</div>
					</div>
					<div class="mt-6 pt-6 border-t border-dashed border-border">
						<p class="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-soft mb-3">Hasil Perhitungan</p>
						<div class="bg-brand/10 p-5 rounded-xl border border-brand/20">
							<p class="text-[10px] text-brand font-bold font-mono uppercase tracking-widest mb-1">HARGA JUAL IDEAL</p>
							<p class="text-3xl font-black font-grotesk text-brand mb-3">{formatRupiah(hargaJual())}</p>
							<div class="flex justify-between text-sm pt-3 border-t border-brand/10">
								<span class="text-ink-soft font-mono text-xs">Laba Bersih per item</span>
								<span class="font-bold text-brand font-mono">+{formatRupiah(profitPerItem())}</span>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if activeMode === 'bep'}
			<Card.Root class="bg-paper shadow-sm border-border rounded-2xl">
				<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
					<Card.Title class="font-grotesk text-ink text-lg">Titik Impas (BEP)</Card.Title>
					<Card.Description class="text-ink-soft text-sm">
						Ketahui berapa unit harus terjual agar tidak rugi.
					</Card.Description>
				</Card.Header>
				<Card.Content class="pt-6 space-y-4">
					<div class="space-y-2">
						<Label class="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Biaya Tetap (Per Bulan)</Label>
						<p class="text-xs text-ink-soft">Misal: Sewa, Gaji, Listrik</p>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono font-bold">Rp</span>
							<Input type="number" bind:value={biayaTetap} class="pl-10 font-mono" placeholder="0" />
						</div>
					</div>
					<div class="space-y-2">
						<Label class="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Harga Jual (Per Unit)</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono font-bold">Rp</span>
							<Input type="number" bind:value={hargaJualUnit} class="pl-10 font-mono" placeholder="0" />
						</div>
					</div>
					<div class="space-y-2">
						<Label class="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Biaya Variabel / Modal (Per Unit)</Label>
						<p class="text-xs text-ink-soft">HPP atau bahan baku per produk</p>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono font-bold">Rp</span>
							<Input type="number" bind:value={biayaVariabel} class="pl-10 font-mono" placeholder="0" />
						</div>
					</div>
					<div class="mt-6 pt-6 border-t border-dashed border-border">
						<p class="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-soft mb-3">Hasil BEP</p>
						{#if hargaJualUnit && biayaVariabel && hargaJualUnit <= biayaVariabel}
							<div class="bg-cta/10 text-cta p-4 rounded-xl text-sm font-semibold border border-cta/20">
								⚠️ Harga jual tidak boleh lebih kecil atau sama dengan biaya variabel. Anda akan selalu rugi.
							</div>
						{:else}
							<div class="bg-paper-alt p-5 rounded-xl border border-border flex flex-col items-center text-center">
								<p class="text-[10px] text-ink-soft font-mono uppercase tracking-widest mb-1">TARGET PENJUALAN MINIMAL</p>
								<p class="text-4xl font-black font-grotesk text-ink mb-2">
									{bepUnit()} <span class="text-lg text-ink-soft font-sans">Unit</span>
								</p>
								<p class="text-sm text-ink-soft">
									Atau setara omzet <span class="font-bold text-ink font-mono">{formatRupiah(bepRupiah())}</span>
								</p>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if activeMode === 'roi'}
			<Card.Root class="bg-paper shadow-sm border-border rounded-2xl">
				<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
					<Card.Title class="font-grotesk text-ink text-lg">ROI (Balik Modal)</Card.Title>
					<Card.Description class="text-ink-soft text-sm">
						Ukur persentase pengembalian modal dari keuntungan.
					</Card.Description>
				</Card.Header>
				<Card.Content class="pt-6 space-y-4">
					<div class="space-y-2">
						<Label class="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Total Modal Investasi</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono font-bold">Rp</span>
							<Input type="number" bind:value={modalAwal} class="pl-10 font-mono" placeholder="0" />
						</div>
					</div>
					<div class="space-y-2">
						<Label class="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Keuntungan Bersih (Total Laba)</Label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm font-mono font-bold">Rp</span>
							<Input type="number" bind:value={untungBersih} class="pl-10 font-mono" placeholder="0" />
						</div>
					</div>
					<div class="mt-6 pt-6 border-t border-dashed border-border">
						<p class="text-[10px] font-bold uppercase tracking-widest font-mono text-ink-soft mb-3">Hasil ROI</p>
						<div class="bg-paper-alt p-5 rounded-xl border border-border flex flex-col items-center text-center">
							<p class="text-[10px] text-ink-soft font-mono uppercase tracking-widest mb-1">PERSENTASE BALIK MODAL</p>
							<p class="text-4xl font-black font-grotesk {roi() >= 100 ? 'text-success' : 'text-brand'} mb-2">
								{roi().toFixed(2)} %
							</p>
							<p class="text-sm text-ink-soft">
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
