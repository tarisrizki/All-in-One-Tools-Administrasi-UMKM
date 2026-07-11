/// <reference types="w3c-web-usb" />

export class ESCPOSPrinter {
	private device: USBDevice | null = null;

	get isConnected() {
		return this.device !== null;
	}

	async connect() {
		if (typeof navigator === 'undefined' || !navigator.usb) {
			throw new Error('WebUSB tidak didukung di browser ini. Gunakan Chrome untuk PC/Android.');
		}
		
		try {
			// Request user to select a generic USB device (printer)
			this.device = await navigator.usb.requestDevice({ filters: [] });
			await this.device.open();
			if (this.device.configuration === null) {
				await this.device.selectConfiguration(1);
			}
			// claim interface 0 (standard for printers)
			await this.device.claimInterface(0);
			return true;
		} catch (error) {
			console.error("Printer connection failed:", error);
			throw new Error("Koneksi printer dibatalkan atau gagal.");
		}
	}

	async printReceipt(storeName: string, items: any[], grandTotal: string) {
		if (!this.device) {
			throw new Error("Printer belum terhubung. Silakan hubungkan dulu.");
		}

		let receiptText = `\n     ${storeName.toUpperCase()}     \n`;
		receiptText += `==============================\n`;
		items.forEach(item => {
			receiptText += `${item.name}\n`;
			receiptText += `${item.qty}x @${item.price}     ${item.qty * item.price}\n`;
		});
		receiptText += `==============================\n`;
		receiptText += `TOTAL: Rp${grandTotal}\n`;
		receiptText += `\n   Terima Kasih   \n\n\n\n`;

		const encoder = new TextEncoder();
		const data = encoder.encode(receiptText);

		// ESC/POS Commands
		const init = new Uint8Array([0x1B, 0x40]); // Initialize
		const alignCenter = new Uint8Array([0x1B, 0x61, 0x01]); // Align center
		const cut = new Uint8Array([0x1D, 0x56, 0x00]); // Full cut

		try {
			// Find Out endpoint
			const endpoint = this.device.configuration?.interfaces[0].alternate.endpoints.find((e: any) => e.direction === 'out');
			if (!endpoint) throw new Error("Endpoint output USB tidak ditemukan.");

			const out = endpoint.endpointNumber;
			await this.device.transferOut(out, init);
			await this.device.transferOut(out, alignCenter);
			await this.device.transferOut(out, data);
			await this.device.transferOut(out, cut);

		} catch (error) {
			console.error("Failed to print:", error);
			throw new Error("Gagal mengirim data ke printer.");
		}
	}

	async disconnect() {
		if (this.device) {
			await this.device.close();
			this.device = null;
		}
	}

	printBrowserReceipt(storeName: string, items: any[], grandTotal: string, transactionId?: string) {
		// Buat iframe tersembunyi
		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.right = '-1000px';
		iframe.style.bottom = '-1000px';
		iframe.style.width = '0';
		iframe.style.height = '0';
		document.body.appendChild(iframe);

		const dateStr = new Date().toLocaleString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

		const itemsHtml = items.map(item => `
			<div class="item">
				<div class="item-name">${item.name}</div>
				<div class="item-details">
					<span>${item.qty} x ${parseInt(item.price).toLocaleString('id-ID')}</span>
					<span>${(item.qty * item.price).toLocaleString('id-ID')}</span>
				</div>
			</div>
		`).join('');

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Struk - ${storeName}</title>
				<style>
					@page {
						margin: 0;
						size: 58mm auto; /* Default for thermal printers */
					}
					body {
						font-family: 'Courier New', Courier, monospace; /* Monospace is better for receipts */
						margin: 0;
						padding: 10px;
						color: #000;
						width: 100%;
						max-width: 58mm;
						font-size: 12px;
						line-height: 1.4;
					}
					@media print {
						body {
							/* For A4 printers, limit width and center */
							max-width: 300px;
							margin: 0 auto;
						}
					}
					.text-center { text-align: center; }
					.store-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
					.divider { border-top: 1px dashed #000; margin: 8px 0; }
					.item-name { font-weight: bold; }
					.item-details { display: flex; justify-content: space-between; }
					.total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 10px; }
					.footer { margin-top: 15px; font-size: 10px; }
				</style>
			</head>
			<body>
				<div class="text-center">
					<div class="store-name">${storeName}</div>
					<div>${dateStr}</div>
					${transactionId ? `<div>ID: ${transactionId.substring(0, 8).toUpperCase()}</div>` : ''}
				</div>
				
				<div class="divider"></div>
				
				<div class="items">
					${itemsHtml}
				</div>
				
				<div class="divider"></div>
				
				<div class="total-row">
					<span>TOTAL</span>
					<span>Rp ${parseInt(grandTotal).toLocaleString('id-ID')}</span>
				</div>
				
				<div class="divider"></div>
				
				<div class="text-center footer">
					<div>Terima Kasih Atas Kunjungan Anda</div>
					<div>Struk ini adalah bukti pembayaran sah</div>
				</div>
				<script>
					window.onload = function() {
						setTimeout(function() {
							window.print();
						}, 300);
					}
				</script>
			</body>
			</html>
		`;

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
		}

		// Cleanup iframe after printing
		setTimeout(() => {
			if (iframe.parentNode) {
				iframe.parentNode.removeChild(iframe);
			}
		}, 60000); // Wait enough time for user to interact with print dialog
	}
}

export const thermalPrinter = new ESCPOSPrinter();
