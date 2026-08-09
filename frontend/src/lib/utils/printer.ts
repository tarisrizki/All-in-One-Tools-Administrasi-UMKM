/// <reference types="w3c-web-usb" />
/// <reference types="web-bluetooth" />
import { getApiUrl } from './api';

function buildReceiptText(storeName: string, items: any[], grandTotal: string) {
	let t = `\n     ${storeName.toUpperCase()}     \n`;
	t += `==============================\n`;
	items.forEach((item: any) => {
		t += `${item.name}\n`;
		t += `${item.qty}x @${item.price}     ${item.qty * item.price}\n`;
	});
	t += `==============================\n`;
	t += `TOTAL: Rp${grandTotal}\n`;
	t += `\n   Terima Kasih   \n\n\n\n`;
	return t;
}

function escPosBytes(storeName: string, items: any[], grandTotal: string): Uint8Array {
	const text = buildReceiptText(storeName, items, grandTotal);
	const enc = new TextEncoder().encode(text);
	const init = new Uint8Array([0x1b, 0x40]);
	const alignCenter = new Uint8Array([0x1b, 0x61, 0x01]);
	const cut = new Uint8Array([0x1d, 0x56, 0x00]);
	const out = new Uint8Array(init.length + alignCenter.length + enc.length + cut.length);
	out.set(init, 0);
	out.set(alignCenter, init.length);
	out.set(enc, init.length + alignCenter.length);
	out.set(cut, init.length + alignCenter.length + enc.length);
	return out;
}

export type PrinterTransport = 'usb' | 'bluetooth' | 'serial' | 'proxy' | 'browser';

export class ESCPOSPrinter {
	private device: USBDevice | null = null;
	private btCharacteristic: any = null;
	private btDevice: any = null;
	private serialPort: any = null;

	get isConnected() {
		return this.device !== null || this.btCharacteristic !== null || this.serialPort !== null;
	}
	get connectedTransport(): PrinterTransport | null {
		if (this.device) return 'usb';
		if (this.btCharacteristic) return 'bluetooth';
		if (this.serialPort) return 'serial';
		return null;
	}

	async connect() {
		if (typeof navigator === 'undefined' || !(navigator as any).usb) {
			throw new Error('WebUSB tidak didukung di browser ini. Gunakan Chrome untuk PC/Android.');
		}
		try {
			this.device = await (navigator as any).usb.requestDevice({ filters: [] });
			const d: any = this.device;
			await (d as any).open();
			if ((d as any).configuration === null) await (d as any).selectConfiguration(1);
			await (d as any).claimInterface(0);
			return true;
		} catch (error) {
			console.error('Printer connection failed:', error);
			throw new Error('Koneksi printer dibatalkan atau gagal.');
		}
	}

	// Transport 2: Bluetooth GATT (Web Bluetooth)
	async connectBluetooth(): Promise<boolean> {
		const nav: any = navigator as any;
		if (typeof navigator === 'undefined' || !nav.bluetooth) {
			throw new Error('Web Bluetooth tidak didukung. Gunakan Chrome Android/PC dengan HTTPS.');
		}
		try {
			// ponytail: acceptAllDevices + optionalServices covers most ESC/POS BT printers; refine service UUID when model known
			const device = await nav.bluetooth.requestDevice({
				acceptAllDevices: true,
				optionalServices: [
					'000018f0-0000-1000-8000-00805f9b34fb',
					'49535343-fe7d-4ae5-8fa9-9fafd205e455',
					'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
				]
			});
			const server = await device.gatt.connect();
			// try common printer service UUIDs sequentially
			const uuids = [
				'49535343-8841-43f4-a8d4-ecbe34729bb3',
				'000018f0-0000-1000-8000-00805f9b34fb',
				'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
			];
			let char: any = null;
			for (const svcUuid of uuids) {
				try {
					const svc = await server.getPrimaryService(svcUuid);
					const chars = await svc.getCharacteristics();
					char = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse) || chars[0];
					if (char) break;
				} catch {}
			}
			if (!char) {
				// fallback: enumerate all services
				const services = await server.getPrimaryServices();
				for (const svc of services) {
					try {
						const chars = await svc.getCharacteristics();
						char = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
						if (char) break;
					} catch {}
				}
			}
			if (!char) throw new Error('Karakteristik tulis Bluetooth tidak ditemukan.');
			this.btDevice = device;
			this.btCharacteristic = char;
			return true;
		} catch (e: any) {
			console.error('Bluetooth connect failed:', e);
			throw new Error(e?.message || 'Koneksi Bluetooth dibatalkan atau gagal.');
		}
	}

	// Transport 3: Serial (Web Serial)
	async connectSerial(): Promise<boolean> {
		const nav: any = navigator as any;
		if (typeof navigator === 'undefined' || !nav.serial) {
			throw new Error('Web Serial tidak didukung. Gunakan Chrome PC dengan HTTPS.');
		}
		try {
			const port = await nav.serial.requestPort();
			await port.open({ baudRate: 9600 });
			this.serialPort = port;
			return true;
		} catch (e: any) {
			console.error('Serial connect failed:', e);
			throw new Error(e?.message || 'Koneksi Serial dibatalkan atau gagal.');
		}
	}

	async printReceipt(storeName: string, items: any[], grandTotal: string) {
		const data = escPosBytes(storeName, items, grandTotal);
		// Try active transport in priority: USB > Bluetooth > Serial
		if (this.device) {
			const endpoint = this.device.configuration?.interfaces[0].alternate.endpoints.find((e: any) => e.direction === 'out');
			if (!endpoint) throw new Error('Endpoint output USB tidak ditemukan.');
			const out = endpoint.endpointNumber;
			await this.device.transferOut(out, new Uint8Array([0x1b, 0x40]));
			await this.device.transferOut(out, new Uint8Array([0x1b, 0x61, 0x01]));
			const enc = new TextEncoder().encode(buildReceiptText(storeName, items, grandTotal));
			await this.device.transferOut(out, enc);
			await this.device.transferOut(out, new Uint8Array([0x1d, 0x56, 0x00]));
			return;
		}
		if (this.btCharacteristic) {
			// chunk 180 bytes (BLE MTU)
			for (let i = 0; i < data.length; i += 180) {
				const chunk = data.slice(i, i + 180);
				await this.btCharacteristic.writeValueWithoutResponse?.(chunk).catch(() => this.btCharacteristic.writeValue(chunk));
			}
			return;
		}
		if (this.serialPort) {
			const writer = this.serialPort.writable.getWriter();
			await writer.write(data);
			writer.releaseLock();
			return;
		}
		throw new Error('Printer belum terhubung. Silakan hubungkan dulu.');
	}

	// Transport 4: LAN proxy via backend net.Socket TCP 9100 (Proxmox LAN)
	async printViaProxy(ip: string, storeName: string, items: any[], grandTotal: string) {
		if (!ip) throw new Error('IP printer proxy wajib diisi.');
		const esc = escPosBytes(storeName, items, grandTotal);
		// send as base64 to avoid binary JSON loss
		let b64 = '';
		try {
			b64 = btoa(String.fromCharCode(...esc));
		} catch {
			b64 = Buffer ? (globalThis as any).Buffer.from(esc).toString('base64') : '';
		}
		const res = await fetch(getApiUrl('/sales/print/proxy'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(typeof localStorage !== 'undefined' && localStorage.getItem('umkm_token') ? { Authorization: `Bearer ${localStorage.getItem('umkm_token')}` } : {}) },
			body: JSON.stringify({ ip, port: 9100, dataBase64: b64, text: buildReceiptText(storeName, items, grandTotal) })
		});
		if (!res.ok) {
			const j: any = await res.json().catch(() => ({}));
			throw new Error(j?.error?.message || `Proxy print gagal (${res.status})`);
		}
		return true;
	}

	async disconnect() {
		try {
			if (this.device) {
				await this.device.close();
			}
		} catch {}
		this.device = null;
		try {
			if (this.btDevice?.gatt?.connected) this.btDevice.gatt.disconnect();
		} catch {}
		this.btDevice = null;
		this.btCharacteristic = null;
		try {
			if (this.serialPort) await this.serialPort.close();
		} catch {}
		this.serialPort = null;
	}

	printBrowserReceipt(storeName: string, items: any[], grandTotal: string, transactionId?: string) {
		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.right = '-10000px';
		iframe.style.bottom = '-10000px';
		iframe.style.width = '100vw';
		iframe.style.height = '100vh';
		document.body.appendChild(iframe);

		const dateStr = new Date().toLocaleString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});

		const itemsHtml = items
			.map(
				(item: any) => `
			<div class="item">
				<div class="item-name">${item.name}</div>
				<div class="item-details">
					<span>${item.qty} x ${parseInt(item.price).toLocaleString('id-ID')}</span>
					<span>${(item.qty * item.price).toLocaleString('id-ID')}</span>
				</div>
			</div>
		`
			)
			.join('');

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Struk - ${storeName}</title>
				<style>
					@page { margin: 0; size: 58mm auto; }
					body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; color: #000; width: 100%; max-width: 58mm; font-size: 12px; line-height: 1.4; }
					@media print { body { max-width: 300px; margin: 0 auto; } }
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
				<div class="items">${itemsHtml}</div>
				<div class="divider"></div>
				<div class="total-row"><span>TOTAL</span><span>Rp ${parseInt(grandTotal).toLocaleString('id-ID')}</span></div>
				<div class="divider"></div>
				<div class="text-center footer">
					<div>Terima Kasih Atas Kunjungan Anda</div>
					<div>Struk ini adalah bukti pembayaran sah</div>
				</div>
				<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script>
			</body>
			</html>
		`;

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
		}
		setTimeout(() => {
			if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
		}, 60000);
	}
}

export const thermalPrinter = new ESCPOSPrinter();
