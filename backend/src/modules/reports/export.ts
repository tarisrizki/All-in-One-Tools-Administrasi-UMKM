import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

// Helpers
function formatRupiah(amount: number) {
	return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export async function exportToExcel(data: any, tab: string): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "UMKM Tools";
	workbook.created = new Date();

	let sheetName = "Laporan";
	if (tab === "profit-loss") sheetName = "Laba Rugi";
	else if (tab === "cash-flow") sheetName = "Arus Kas";
	else if (tab === "sales") sheetName = "Penjualan";
	else if (tab === "inventory") sheetName = "Inventori";

	const sheet = workbook.addWorksheet(sheetName);

	if (tab === "profit-loss") {
		sheet.columns = [
			{ header: "Keterangan", key: "desc", width: 40 },
			{ header: "Jumlah (Rp)", key: "amount", width: 25 },
		];
		
		// Header formatting
		sheet.getRow(1).font = { bold: true };
		
		sheet.addRow({ desc: "Total Pendapatan (Penjualan)", amount: data.totalRevenue });
		sheet.addRow({ desc: "Total Harga Pokok Penjualan (HPP)", amount: data.totalCogs });
		sheet.addRow({ desc: "Laba Kotor", amount: data.grossProfit });
		sheet.addRow({ desc: "" });
		sheet.addRow({ desc: "Pemasukan Kas Lainnya", amount: data.totalCashIncome });
		sheet.addRow({ desc: "Pengeluaran Kas Lainnya", amount: data.totalCashExpense });
		sheet.addRow({ desc: "" });
		sheet.addRow({ desc: "Laba Bersih", amount: data.netProfit });

		// Make specific rows bold
		sheet.getRow(4).font = { bold: true }; // Laba Kotor
		sheet.getRow(9).font = { bold: true }; // Laba Bersih
	} else if (tab === "sales") {
		sheet.columns = [
			{ header: "Nama Produk", key: "name", width: 40 },
			{ header: "Terjual (Qty)", key: "qty", width: 15 },
			{ header: "Pendapatan (Rp)", key: "revenue", width: 25 },
		];
		
		sheet.getRow(1).font = { bold: true };
		
		sheet.addRow({ name: "TOTAL TRANSAKSI", qty: data.totalTransactions, revenue: "" });
		sheet.addRow({ name: "TOTAL PENDAPATAN", qty: "", revenue: data.totalRevenue });
		sheet.getRow(2).font = { bold: true };
		sheet.getRow(3).font = { bold: true };
		
		sheet.addRow({ name: "" });
		sheet.addRow({ name: "--- 10 PRODUK TERLARIS ---" });
		sheet.getRow(6).font = { italic: true };
		
		for (const p of data.topProducts) {
			sheet.addRow({ name: p.name, qty: p.qty, revenue: p.revenue });
		}
	} else if (tab === "inventory") {
		sheet.columns = [
			{ header: "Nama Produk", key: "name", width: 40 },
			{ header: "Stok Saat Ini", key: "stock", width: 15 },
			{ header: "Stok Minimum", key: "minStock", width: 15 },
			{ header: "Nilai Aset (Rp)", key: "value", width: 25 },
		];
		
		sheet.getRow(1).font = { bold: true };
		
		sheet.addRow({ name: "TOTAL NILAI ASET STOK", stock: "", minStock: "", value: data.totalStockValue });
		sheet.getRow(2).font = { bold: true };
		
		sheet.addRow({ name: "" });
		sheet.addRow({ name: "--- DAFTAR STOK ---" });
		sheet.getRow(4).font = { italic: true };
		
		for (const i of data.inventoryItems) {
			sheet.addRow({ name: i.name, stock: i.stock, minStock: i.minStock, value: i.value });
		}
	} else {
		sheet.columns = [
			{ header: "Kategori", key: "category", width: 30 },
			{ header: "Keterangan", key: "desc", width: 40 },
			{ header: "Jumlah (Rp)", key: "amount", width: 25 },
		];
		
		sheet.getRow(1).font = { bold: true };

		sheet.addRow({ category: "Arus Kas Masuk", desc: "Penjualan Tunai/Lunas", amount: data.cashIn.sales });
		sheet.addRow({ category: "", desc: "Pemasukan Lainnya (Kas)", amount: data.cashIn.cashbook });
		sheet.addRow({ category: "", desc: "Penerimaan Piutang", amount: data.cashIn.receivable });
		sheet.addRow({ category: "", desc: "Total Kas Masuk", amount: data.cashIn.total });
		sheet.getRow(5).font = { bold: true };

		sheet.addRow({ desc: "" });

		sheet.addRow({ category: "Arus Kas Keluar", desc: "Pembelian Stok", amount: data.cashOut.purchases });
		sheet.addRow({ category: "", desc: "Pengeluaran Lainnya (Kas)", amount: data.cashOut.cashbook });
		sheet.addRow({ category: "", desc: "Pembayaran Hutang", amount: data.cashOut.payable });
		sheet.addRow({ category: "", desc: "Total Kas Keluar", amount: data.cashOut.total });
		sheet.getRow(11).font = { bold: true };

		sheet.addRow({ desc: "" });
		sheet.addRow({ category: "Arus Kas Bersih", desc: "", amount: data.netCashFlow });
		sheet.getRow(13).font = { bold: true };
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

export async function exportToPDF(data: any, tab: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({ margin: 50, size: "A4" });
			const buffers: Buffer[] = [];
			doc.on("data", buffers.push.bind(buffers));
			doc.on("end", () => resolve(Buffer.concat(buffers)));

			let title = "Laporan";
			if (tab === "profit-loss") title = "Laporan Laba Rugi";
			else if (tab === "cash-flow") title = "Laporan Arus Kas";
			else if (tab === "sales") title = "Laporan Penjualan";
			else if (tab === "inventory") title = "Laporan Inventori";

			doc.fontSize(20).text(title, { align: "center" });
			doc.moveDown(2);

			doc.fontSize(12);

			if (tab === "profit-loss") {
				doc.text(`Total Pendapatan (Penjualan): ${formatRupiah(data.totalRevenue)}`);
				doc.text(`Total Harga Pokok Penjualan (HPP): ${formatRupiah(data.totalCogs)}`);
				doc.moveDown();
				doc.font("Helvetica-Bold").text(`Laba Kotor: ${formatRupiah(data.grossProfit)}`);
				doc.font("Helvetica").moveDown();
				doc.text(`Pemasukan Kas Lainnya: ${formatRupiah(data.totalCashIncome)}`);
				doc.text(`Pengeluaran Kas Lainnya: ${formatRupiah(data.totalCashExpense)}`);
				doc.moveDown();
				doc.font("Helvetica-Bold").fontSize(14).text(`Laba Bersih: ${formatRupiah(data.netProfit)}`);
			} else if (tab === "sales") {
				doc.text(`Total Transaksi: ${data.totalTransactions}`);
				doc.font("Helvetica-Bold").text(`Total Pendapatan: ${formatRupiah(data.totalRevenue)}`);
				
				doc.moveDown(2);
				doc.font("Helvetica-Bold").fontSize(14).text("10 Produk Terlaris:");
				doc.font("Helvetica").fontSize(12);
				
				for (const p of data.topProducts) {
					doc.text(`- ${p.name}: ${p.qty} terjual (${formatRupiah(p.revenue)})`);
				}
			} else if (tab === "inventory") {
				doc.font("Helvetica-Bold").text(`Total Nilai Aset Stok: ${formatRupiah(data.totalStockValue)}`);
				
				doc.moveDown(2);
				doc.font("Helvetica-Bold").fontSize(14).text("Daftar Stok:");
				doc.font("Helvetica").fontSize(12);
				
				for (const i of data.inventoryItems) {
					const warning = i.stock <= i.minStock ? " (Stok Menipis!)" : "";
					doc.text(`- ${i.name}: ${i.stock} tersisa | Nilai: ${formatRupiah(i.value)}${warning}`);
				}
			} else {
				doc.font("Helvetica-Bold").text("Arus Kas Masuk");
				doc.font("Helvetica").text(`Penjualan Tunai/Lunas: ${formatRupiah(data.cashIn.sales)}`);
				doc.text(`Pemasukan Lainnya (Kas): ${formatRupiah(data.cashIn.cashbook)}`);
				doc.text(`Penerimaan Piutang: ${formatRupiah(data.cashIn.receivable)}`);
				doc.font("Helvetica-Bold").text(`Total Kas Masuk: ${formatRupiah(data.cashIn.total)}`);
				
				doc.moveDown();
				doc.font("Helvetica-Bold").text("Arus Kas Keluar");
				doc.font("Helvetica").text(`Pembelian Stok: ${formatRupiah(data.cashOut.purchases)}`);
				doc.text(`Pengeluaran Lainnya (Kas): ${formatRupiah(data.cashOut.cashbook)}`);
				doc.text(`Pembayaran Hutang: ${formatRupiah(data.cashOut.payable)}`);
				doc.font("Helvetica-Bold").text(`Total Kas Keluar: ${formatRupiah(data.cashOut.total)}`);

				doc.moveDown(2);
				doc.fontSize(14).text(`Arus Kas Bersih: ${formatRupiah(data.netCashFlow)}`);
			}

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}
