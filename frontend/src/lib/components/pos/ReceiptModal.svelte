<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { CheckCircle2, FileText, Download, Printer, Plus } from '@lucide/svelte';
	import { authState } from '$lib/stores/auth.svelte';

	let {
		open,
		transactionId,
		transaction,
		onClose,
		onNewTransaction
	}: {
		open: boolean;
		transactionId: string;
		transaction?: any;
		onClose: () => void;
		onNewTransaction: () => void;
	} = $props();

	let isDownloading = $state<string | null>(null);

	async function downloadPDF(type: string) {
		if (!transactionId) return;
		isDownloading = type;
		
		try {
			const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
			const res = await apiClient(`/sales/${transactionId}/document?type=${type}`, {
				headers: {
					Authorization: `Bearer ${authState.token}`
				}
			});

			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error?.message || 'Gagal generate dokumen');
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			
			// Auto download
			const a = document.createElement('a');
			a.href = url;
			a.download = `${type}-${transactionId.substring(0, 8)}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			
			// Optional: open in new tab for printing
			window.open(url, '_blank');
			
			setTimeout(() => URL.revokeObjectURL(url), 10000);
			toast.success(`Berhasil membuat ${type}`);
		} catch (e: any) {
			toast.error(e.message || `Gagal membuat ${type}. Pastikan data sudah tersinkronisasi ke server.`);
		} finally {
			isDownloading = null;
		}
	}
	import { Input } from '$lib/components/ui/input';
	import { thermalPrinter } from '$lib/utils/printer';

	let waNumber = $state('');
	let emailAddress = $state('');
	let isSendingWa = $state(false);
	let isSendingEmail = $state(false);
	let isPrintingThermal = $state(false);

	async function printThermal() {
		if (!transaction) return toast.error("Data transaksi tidak tersedia");
		isPrintingThermal = true;
		try {
			await thermalPrinter.connect();
			
			const items = transaction.items.map((i: any) => ({
				name: i.name || 'Produk',
				qty: i.quantity,
				price: i.unitPrice
			}));
			
			await thermalPrinter.printReceipt("TOKO BERES UMKM", items, transaction.grandTotal);
			toast.success("Struk berhasil dicetak ke Thermal Printer!");
		} catch (e: any) {
			toast.error(e.message || "Gagal mencetak struk thermal");
		} finally {
			isPrintingThermal = false;
		}
	}

	async function sendWa() {
		if (!waNumber) return toast.error("Masukkan nomor WA");
		isSendingWa = true;
		try {
			const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
			const res = await apiClient(`/sales/${transactionId}/send-wa`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({ to: waNumber })
			});
			if (!res.ok) throw new Error("Gagal mengirim WA");
			toast.success("Resi berhasil dikirim via WhatsApp (Mock)");
			waNumber = '';
		} catch (e: any) {
			toast.error("Transaksi mungkin belum tersinkronisasi. Pastikan online.");
		} finally {
			isSendingWa = false;
		}
	}

	async function sendEmail() {
		if (!emailAddress) return toast.error("Masukkan alamat email");
		isSendingEmail = true;
		try {
			const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
			const res = await apiClient(`/sales/${transactionId}/send-email`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({ to: emailAddress })
			});
			if (!res.ok) throw new Error("Gagal mengirim Email");
			toast.success("Resi berhasil dikirim via Email (Mock)");
			emailAddress = '';
		} catch (e: any) {
			toast.error("Transaksi mungkin belum tersinkronisasi. Pastikan online.");
		} finally {
			isSendingEmail = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={(o) => !o && onClose()}>
	<Dialog.Content class="sm:max-w-[440px] border-border bg-paper shadow-2xl rounded-2xl overflow-hidden p-0">
		<div class="bg-success/10 p-8 flex flex-col items-center justify-center text-center border-b border-border/50 relative overflow-hidden">
			<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-success/20 via-transparent to-transparent"></div>
			<CheckCircle2 class="w-20 h-20 text-success mb-4 relative z-10" />
			<h2 class="font-grotesk text-2xl text-ink font-extrabold relative z-10">Transaksi Berhasil!</h2>
			<p class="text-ink-soft text-sm mt-2 relative z-10">Pesanan telah disimpan dan stok telah diperbarui.</p>
		</div>

		<div class="p-6 space-y-6">
			<div>
				<h3 class="text-xs font-bold uppercase tracking-widest font-mono text-ink-soft mb-3 text-center">Cetak Dokumen</h3>
				<div class="grid grid-cols-2 gap-3">
					<Button
						variant="outline"
						class="flex flex-col items-center justify-center h-24 rounded-xl border-border hover:border-brand hover:text-brand gap-2"
						disabled={isDownloading !== null}
						onclick={() => downloadPDF('invoice')}
					>
						{#if isDownloading === 'invoice'}
							<div class="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin"></div>
						{:else}
							<FileText class="w-6 h-6 text-ink-soft" />
						{/if}
						<span class="font-bold font-mono">Invoice</span>
					</Button>
					
					<Button
						variant="outline"
						class="flex flex-col items-center justify-center h-24 rounded-xl border-border hover:border-brand hover:text-brand gap-2"
						disabled={isDownloading !== null}
						onclick={() => downloadPDF('nota')}
					>
						{#if isDownloading === 'nota'}
							<div class="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin"></div>
						{:else}
							<Printer class="w-6 h-6 text-ink-soft" />
						{/if}
						<span class="font-bold font-mono">Nota</span>
					</Button>

					<Button
						variant="outline"
						class="flex flex-col items-center justify-center h-24 rounded-xl border-border hover:border-brand hover:text-brand gap-2"
						disabled={isDownloading !== null}
						onclick={() => downloadPDF('kwitansi')}
					>
						{#if isDownloading === 'kwitansi'}
							<div class="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin"></div>
						{:else}
							<Download class="w-6 h-6 text-ink-soft" />
						{/if}
						<span class="font-bold font-mono">Kwitansi</span>
					</Button>

					<Button
						variant="outline"
						class="flex flex-col items-center justify-center h-24 rounded-xl border-border hover:border-brand hover:text-brand gap-2"
						disabled={isDownloading !== null}
						onclick={() => downloadPDF('surat_jalan')}
					>
						{#if isDownloading === 'surat_jalan'}
							<div class="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin"></div>
						{:else}
							<FileText class="w-6 h-6 text-ink-soft" />
						{/if}
						<span class="font-bold font-mono">Surat Jalan</span>
					</Button>
				</div>

			<div class="space-y-4">
				<h3 class="text-xs font-bold uppercase tracking-widest font-mono text-ink-soft mb-3 text-center">Kirim Resi Digital & Cetak Langsung</h3>
				
				<Button
					variant="outline"
					class="w-full h-11 border-border text-ink hover:bg-muted font-bold rounded-xl flex items-center justify-center gap-2"
					onclick={printThermal}
					disabled={isPrintingThermal}
				>
					<Printer class="w-4 h-4" />
					{#if isPrintingThermal} Menghubungkan Printer... {:else} Cetak Thermal (WebUSB) {/if}
				</Button>

				<div class="flex gap-2">
					<Input type="tel" placeholder="08xx..." bind:value={waNumber} class="h-11 rounded-xl" />
					<Button
						class="h-11 shrink-0 bg-green-600 hover:bg-green-700 text-white rounded-xl"
						onclick={sendWa}
						disabled={isSendingWa}
					>
						Kirim WA
					</Button>
				</div>
				<div class="flex gap-2">
					<Input type="email" placeholder="email@..." bind:value={emailAddress} class="h-11 rounded-xl" />
					<Button
						class="h-11 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
						onclick={sendEmail}
						disabled={isSendingEmail}
					>
						Kirim Email
					</Button>
				</div>
			</div>

			<p class="text-[10px] text-ink-soft text-center mt-3 font-mono">
					Catatan: Jika koneksi offline, pastikan transaksi telah tersinkronisasi sebelum mencetak.
				</p>
			</div>
		</div>

		<div class="p-4 bg-muted/30 border-t border-border flex justify-center">
			<Button
				class="w-full rounded-full font-bold bg-brand hover:bg-brand-dark shadow-md gap-2 h-12"
				onclick={onNewTransaction}
			>
				<Plus class="w-5 h-5" />
				Transaksi Baru
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
