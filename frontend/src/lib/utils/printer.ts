/// <reference types="w3c-web-usb" />

export class ESCPOSPrinter {
	private device: USBDevice | null = null;

	async connect() {
		if (!navigator.usb) {
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
}

export const thermalPrinter = new ESCPOSPrinter();
