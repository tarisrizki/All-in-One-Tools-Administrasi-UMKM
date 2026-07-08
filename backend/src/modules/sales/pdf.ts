import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function generateSalesDocument(
	saleData: any,
	businessData: any,
	documentType: 'invoice' | 'nota' | 'kwitansi' | 'surat_jalan'
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50 });
		const chunks: Buffer[] = [];

		doc.on('data', (chunk) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		// Header
		doc.fontSize(20).text(businessData.name, { align: 'center' });
		if (businessData.address) {
			doc.fontSize(10).text(businessData.address, { align: 'center' });
		}
		if (businessData.phone) {
			doc.fontSize(10).text(`Telp: ${businessData.phone}`, { align: 'center' });
		}
		doc.moveDown();

		// Document Title
		let title = 'INVOICE';
		if (documentType === 'nota') title = 'NOTA PENJUALAN';
		if (documentType === 'kwitansi') title = 'KWITANSI';
		if (documentType === 'surat_jalan') title = 'SURAT JALAN';

		doc.fontSize(16).text(title, { align: 'center', underline: true });
		doc.moveDown();

		// Info
		doc.fontSize(10);
		doc.text(`No: ${saleData.invoiceNumber}`);
		doc.text(`Tanggal: ${new Date(saleData.createdAt).toLocaleDateString('id-ID')}`);
		doc.text(`Klien TX: ${saleData.clientTransactionId}`);
		doc.moveDown();

		// Items Table
		const tableTop = doc.y;
		doc.font('Helvetica-Bold');
		doc.text('Produk', 50, tableTop);
		doc.text('Qty', 250, tableTop);
		if (documentType !== 'surat_jalan') {
			doc.text('Harga', 300, tableTop);
			doc.text('Subtotal', 400, tableTop);
		}

		doc.moveTo(50, doc.y + 5).lineTo(500, doc.y + 5).stroke();
		
		let yPosition = doc.y + 15;
		doc.font('Helvetica');
		
		let subtotalAmount = 0;

		for (const item of saleData.items) {
			doc.text(item.productName || 'Produk', 50, yPosition);
			doc.text(item.qty.toString(), 250, yPosition);
			
			if (documentType !== 'surat_jalan') {
				doc.text(item.price.toString(), 300, yPosition);
				const rowSubtotal = (parseFloat(item.price) - parseFloat(item.discount || '0')) * item.qty;
				subtotalAmount += rowSubtotal;
				doc.text(rowSubtotal.toString(), 400, yPosition);
			}
			yPosition += 20;
		}

		doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
		yPosition += 15;

		if (documentType !== 'surat_jalan') {
			doc.font('Helvetica-Bold');
			doc.text('Total:', 300, yPosition);
			doc.text(saleData.grandTotal.toString(), 400, yPosition);
			yPosition += 20;
			
			// Pembayaran
			doc.font('Helvetica');
			let totalPaid = 0;
			for (const pay of saleData.payments) {
				doc.text(`Dibayar (${pay.method}):`, 300, yPosition);
				doc.text(pay.amount.toString(), 400, yPosition);
				totalPaid += parseFloat(pay.amount);
				yPosition += 15;
			}
			
			if (totalPaid < parseFloat(saleData.grandTotal)) {
				doc.font('Helvetica-Bold');
				doc.text('Sisa Tagihan (Piutang):', 300, yPosition);
				doc.text((parseFloat(saleData.grandTotal) - totalPaid).toString(), 400, yPosition);
			}
		}

		doc.moveDown(4);

		// Stamp & Signature (if any)
		const settings = businessData.settings || {};
		const bottomY = doc.y;

		if (settings.signatureUrl || settings.stampUrl) {
			// This expects local paths inside uploads/ directory for now
			// e.g. /uploads/signature.png
			const rootDir = path.resolve();
			
			if (settings.stampUrl) {
				const stampPath = path.join(rootDir, settings.stampUrl);
				if (fs.existsSync(stampPath)) {
					doc.image(stampPath, 350, bottomY - 50, { width: 80 });
				}
			}

			if (settings.signatureUrl) {
				const sigPath = path.join(rootDir, settings.signatureUrl);
				if (fs.existsSync(sigPath)) {
					doc.image(sigPath, 400, bottomY - 30, { width: 80 });
				}
			}
		}

		doc.text('Hormat Kami,', 400, bottomY);
		doc.text(businessData.name, 400, bottomY + 60);

		doc.end();
	});
}
