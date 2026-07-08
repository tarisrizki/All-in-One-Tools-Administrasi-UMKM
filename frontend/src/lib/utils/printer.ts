/// <reference types="web-bluetooth" />
/**
 * WebBluetooth Thermal Printer Utility (ESC/POS)
 * Only works in browsers that support WebBluetooth (Chrome, Edge for Android/Desktop).
 */

let printerDevice: BluetoothDevice | null = null;
let printerCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

// Basic ESC/POS Commands
const ESC = 0x1b;
const INIT = [ESC, 0x40]; // Initialize printer
const BOLD_ON = [ESC, 0x45, 1];
const BOLD_OFF = [ESC, 0x45, 0];
const CENTER = [ESC, 0x61, 1];
const LEFT = [ESC, 0x61, 0];
const FEED = [0x0a]; // Line feed

export async function connectPrinter() {
	try {
		if (!navigator.bluetooth) {
			throw new Error('WebBluetooth tidak didukung di browser ini.');
		}

		// Typical bluetooth thermal printers expose this service
		const device = await navigator.bluetooth.requestDevice({
			filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
			optionalServices: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2']
		});

		const server = await device.gatt?.connect();
		if (!server) throw new Error('Gagal terhubung ke GATT Server');

		const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
		const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

		printerDevice = device;
		printerCharacteristic = characteristic;

		return true;
	} catch (error) {
		console.error('Bluetooth connection failed:', error);
		throw error;
	}
}

export function isPrinterConnected(): boolean {
	return (
		printerDevice !== null &&
		printerCharacteristic !== null &&
		printerDevice.gatt?.connected === true
	);
}

export async function printText(text: string) {
	if (!isPrinterConnected() || !printerCharacteristic) {
		throw new Error('Printer belum terhubung.');
	}

	// Encode string to Uint8Array (Latin1/ASCII)
	const encoder = new TextEncoder();
	const data = encoder.encode(text);

	// Write chunks (BLE usually has a 20-512 byte limit per payload, we use 100 for safety)
	const CHUNK_SIZE = 100;
	for (let i = 0; i < data.length; i += CHUNK_SIZE) {
		const chunk = data.slice(i, i + CHUNK_SIZE);
		await printerCharacteristic.writeValue(chunk);
	}
}

export async function printReceipt(storeName: string, items: any[], total: number) {
	// Simple 58mm format (32 chars per line)
	const pad = (str: string, len: number) => (str + ' '.repeat(len)).substring(0, len);
	const padLeft = (str: string, len: number) => (' '.repeat(len) + str).slice(-len);

	let receipt = '';

	// Header
	receipt += `          ${storeName}\n`;
	receipt += `================================\n`;

	// Items
	for (const item of items) {
		receipt += `${item.name}\n`;
		const qtyStr = `${item.qty}x`;
		const priceStr = item.price.toString();
		const subTotal = (item.qty * item.price).toString();

		// qty x price ......... subtotal
		receipt += `${pad(qtyStr + ' ' + priceStr, 20)} ${padLeft(subTotal, 11)}\n`;
	}

	receipt += `--------------------------------\n`;
	receipt += `TOTAL:             ${padLeft(total.toString(), 13)}\n`;
	receipt += `================================\n`;
	receipt += `       Terima Kasih!            \n\n\n`; // Feed 3 lines

	await printText(receipt);
}
