import { test, expect } from '@playwright/test';

test.describe('Purchases (PO)', () => {
	const timestamp = Date.now();

	test('TC-PUR-01: Pembuatan PO dan Update Status', async ({ page }) => {
		test.setTimeout(60000); // give it more time

		// 1. Register & Setup
		await page.goto('/auth/register');
		await page.fill('input[type="tel"]', `089${timestamp.toString().slice(-9)}`);
		await page.fill('input[type="password"]', 'Password123!');
		await page.click('button[type="submit"]');

		await page.waitForSelector('input[id="businessName"]');
		await page.fill('input[id="businessName"]', 'Toko PO Tes');
		await page.click('button[type="submit"]');

		await expect(page.locator('h1', { hasText: 'Halo' })).toBeVisible({ timeout: 10000 });

		// 2. Buat Pemasok
		await page.goto('/suppliers/new');
		await page.fill('input#name', 'Supplier PO');
		await page.fill('input#phone', '08111111111');
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL('/suppliers');

		// 3. Buat PO Baru
		await page.goto('/purchases/new');
		// Pilih Supplier (it's a native select or shadcn select? shadcn select is a bit tricky, let's assume typing in an input or clicking it)
		// For shadcn select, we click the trigger then click the option
		await page.click('button[role="combobox"]');
		await page.click('text=Supplier PO');

		// Tambah Item
		await page.click('button:has-text("Tambah Item Barang")');
		await page.fill('input[placeholder="Nama Barang"]', 'Buku Tulis');
		await page.fill('input[placeholder="Jumlah"]', '10');
		await page.fill('input[placeholder="Harga Satuan"]', '5000');

		await page.click('button[type="submit"]:has-text("Simpan PO")');

		await expect(page).toHaveURL('/purchases');
		await expect(page.locator('text=Supplier PO')).toBeVisible();
		await expect(page.locator('text=DRAFT')).toBeVisible();

		// 4. Update Status PO ke Ordered
		await page.click('button:has-text("Update Status")');
		await page.locator('label', { hasText: 'Dipesan (Ordered)' }).click();
		await page.click('button:has-text("Simpan Status")');

		await expect(page.locator('text=DIPESAN')).toBeVisible();

		// 5. Update Status PO ke Received
		await page.click('button:has-text("Update Status")');
		await page.locator('label', { hasText: 'Diterima (Received)' }).click();
		await page.click('button:has-text("Simpan Status")');

		await expect(page.locator('text=DITERIMA')).toBeVisible();
	});
});
