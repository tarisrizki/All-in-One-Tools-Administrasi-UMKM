import { test, expect } from '@playwright/test';

test.describe('Point of Sale & Inventory', () => {
	const timestamp = Date.now();
	const testEmail = `kasir_${timestamp}@umkmtools.id`;

	test.beforeAll(async ({ browser }) => {
		// We could use API requests to seed data, but for this simple E2E,
		// we'll just let the test create what it needs via UI or assume
		// the first test registers an account.
		// Actually, let's just do it in one big test or rely on sequential execution.
	});

	test('TC-POS-01: Transaksi tunai online (Register -> Tambah Produk -> POS)', async ({ page }) => {
		test.setTimeout(60000); // give it more time

		// 1. Register & Onboarding
		await page.goto('/auth/register');
		await page.fill('input[type="tel"]', `089${timestamp.toString().slice(-9)}`);
		await page.fill('input[type="password"]', 'Password123!');
		await page.click('button[type="submit"]');

		await page.waitForSelector('input[id="businessName"]');
		await page.fill('input[id="businessName"]', 'Toko POS Tes');
		await page.click('button[type="submit"]');

		await expect(page.locator('h1', { hasText: 'Halo' })).toBeVisible({ timeout: 10000 });

		// 3. Tambah Produk
		await page.goto('/products/new');
		await page.fill('input#name', 'Keripik E2E');
		await page.fill('input#sku', `SKU-${timestamp}`);
		await page.fill('input#costPrice', '10000');
		await page.fill('input#sellPrice', '15000');
		await page.fill('input#initialStock', '100');
		await page.click('button[type="submit"]:has-text("Simpan Produk")');

		await expect(page).toHaveURL('/products');
		await expect(page.locator('text=Keripik E2E')).toBeVisible();

		// 4. Buka Halaman POS
		await page.goto('/pos');
		// Cari produk
		await page.fill('input[placeholder="Cari barang atau scan barcode..."]', 'Keripik E2E');
		// Klik produk di hasil pencarian
		await page.click('text=Keripik E2E');

		// Pastikan masuk keranjang
		await expect(page.locator('text=Total Tagihan')).toBeVisible();

		// Accept alert dialog automatically
		page.on('dialog', (dialog) => dialog.accept());

		// 5. Bayar
		await page.click('button:has-text("Bayar Sekarang")');

		// Modal Bayar
		await expect(page.locator('h2:has-text("Pembayaran")')).toBeVisible();
		await page.fill('input#payAmount', '15000'); // Bayar Pas
		await page.click('button:has-text("Selesaikan Transaksi")');

		// 6. Pastikan keranjang kosong setelah bayar (aside otomatis hilang)
		await expect(page.locator('text=Total Tagihan').first()).not.toBeVisible();
	});
});
