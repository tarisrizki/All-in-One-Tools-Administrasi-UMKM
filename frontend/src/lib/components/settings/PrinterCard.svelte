<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { Usb, Printer, MonitorOff } from '@lucide/svelte';
	import { thermalPrinter } from '$lib/utils/printer';
	import { authState } from '$lib/stores/auth.svelte';

	let printerStatus = $state('Terputus');
	let connecting = $state(false);
	
	// Check if browser supports WebUSB (Safari/iOS does not)
	const usbSupported = typeof navigator !== 'undefined' && 'usb' in navigator;

	async function handleConnectPrinter() {
		connecting = true;
		try {
			await thermalPrinter.connect();
			printerStatus = 'Terhubung';
			toast.success('Printer berhasil dihubungkan via WebUSB!');
		} catch (e: any) {
			toast.error('Gagal menghubungkan printer: ' + e.message);
		} finally {
			connecting = false;
		}
	}

	async function handleTestPrint() {
		try {
			const storeName = authState.user?.businessName || authState.user?.business_name || 'Toko Anda';
			await thermalPrinter.printReceipt(storeName, [{name: 'Test Produk', qty: 1, price: 1000}], '1000');
			toast.success('Struk tes sedang dicetak');
		} catch (e: any) {
			toast.error('Gagal mencetak: ' + e.message);
		}
	}
</script>

<Card.Root class="bg-paper shadow-sm border-border rounded-2xl overflow-hidden relative">
	<div
		class="absolute top-0 right-10 w-8 h-4 bg-surface rounded-b-full border-b border-l border-r border-border"
	></div>

	<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
		<Card.Title class="flex items-center gap-2 font-grotesk text-ink text-xl">
			<Printer class="w-5 h-5 text-brand" />
			Printer Thermal
		</Card.Title>
		<Card.Description class="text-ink-soft text-sm"
			>Koneksikan printer struk kasir via Bluetooth.</Card.Description
		>
	</Card.Header>
	<Card.Content class="pt-6">
		{#if usbSupported}
			<div class="bg-blue-500/10 text-blue-700 p-4 rounded-xl border border-blue-500/20 mb-6 flex gap-3">
				<div class="mt-0.5"><Usb class="w-5 h-5 text-blue-500" /></div>
				<p class="text-xs font-semibold leading-relaxed">
					Fitur pencetakan ini memerlukan perangkat dengan dukungan WebUSB (Chrome/Edge di
					Desktop atau Android).
				</p>
			</div>

			<div
				class="flex justify-between items-center mb-6 border-b border-dashed border-border/60 pb-4"
			>
				<span class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono"
					>Status Koneksi</span
				>
				{#if printerStatus === 'Terhubung'}
					<Badge
						class="bg-success text-white border-none shadow-none font-bold tracking-wider rounded-md text-[10px] px-2 py-0.5"
						>TERHUBUNG</Badge
					>
				{:else}
					<Badge
						variant="outline"
						class="text-warning border-warning bg-warning/10 font-bold tracking-wider rounded-md text-[10px] px-2 py-0.5"
						>TERPUTUS</Badge
					>
				{/if}
			</div>

			<div class="space-y-3">
				<Button
					onclick={handleConnectPrinter}
					disabled={connecting}
					class="w-full font-bold h-12 rounded-xl bg-cta hover:bg-cta-dark text-white shadow-md hover:-translate-y-0.5 transition-all gap-2"
				>
					<Usb class="w-5 h-5" />
					{#if connecting}Mencari Perangkat...{:else}Cari & Hubungkan Printer{/if}
				</Button>

				{#if printerStatus === 'Terhubung'}
					<Button
						variant="outline"
						onclick={handleTestPrint}
						class="w-full font-bold h-12 rounded-xl border-dashed border-border text-ink-soft hover:text-ink hover:bg-muted gap-2"
					>
						<Printer class="w-4 h-4" /> Tes Cetak Struk
					</Button>
				{/if}
			</div>
		{:else}
			<div class="bg-warning/10 text-warning-dark p-6 rounded-xl border border-warning/30 flex flex-col items-center text-center gap-3">
				<MonitorOff class="w-10 h-10 text-warning mb-1" />
				<p class="text-sm font-bold text-ink">WebUSB Tidak Didukung</p>
				<p class="text-xs text-ink-soft leading-relaxed">
					Browser atau perangkat Anda (misalnya Safari/iOS) tidak mendukung fitur cetak thermal USB.
					Namun jangan khawatir, Anda tetap bisa menggunakan tombol <b>"Cetak Struk"</b> biasa saat bertransaksi di halaman Kasir.
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
