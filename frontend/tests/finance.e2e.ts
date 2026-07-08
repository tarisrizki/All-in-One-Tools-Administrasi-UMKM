import { test, expect } from '@playwright/test';

test.describe('Finance & Debts', () => {
	const timestamp = Date.now();

	test('TC-FIN-01: Buku Kas & Hutang Piutang', async ({ page }) => {
		test.setTimeout(60000);

		// 1. Register & Setup
		await page.goto('/auth/register');
		await page.fill('input[type="tel"]', `089${timestamp.toString().slice(-9)}`);
		await page.fill('input[type="password"]', 'Password123!');
		await page.click('button[type="submit"]');

		await page.waitForSelector('input[id="businessName"]');
		await page.fill('input[id="businessName"]', 'Toko Keuangan');
		await page.click('button[type="submit"]');

		await expect(page.locator('h1', { hasText: 'Halo' })).toBeVisible({ timeout: 10000 });

		// 2. Tambah Catatan Buku Kas (Pemasukan)
		await page.goto('/cashbook/new');
		// shadcn select for type
		await page.click('button[role="combobox"]');
		await page.click('text=Pemasukan');
		await page.fill('input#amount', '500000');
		await page.fill('textarea#description', 'Modal Awal');
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/cashbook');
		await expect(page.locator('text=Modal Awal')).toBeVisible();

		// 3. Buat Pelanggan
		await page.goto('/customers/new');
		await page.fill('input#name', 'Si Pengutang');
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL('/customers');

		// 4. Catat Hutang Baru
		await page.goto('/debts/new');
		// Select Customer
		await page.click('button[role="combobox"]');
		await page.click('text=Si Pengutang');
		await page.fill('input#amount', '100000');
		await page.fill('textarea#description', 'Hutang Sembako');
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/debts');
		await expect(page.locator('text=Si Pengutang')).toBeVisible();
		await expect(page.locator('text=BELUM LUNAS')).toBeVisible();
	});
});
