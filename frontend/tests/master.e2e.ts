import { test, expect } from '@playwright/test';

test.describe('Master Data', () => {
	const timestamp = Date.now();

	test.beforeEach(async ({ page }) => {
		page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
		page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
		page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));

		await page.goto('/auth/register');
		await page.fill('input[type="tel"]', `089${timestamp.toString().slice(-9)}`);
		await page.fill('input[type="password"]', 'Password123!');
		await page.click('button[type="submit"]');

		await page.waitForSelector('input[id="businessName"]');
		await page.fill('input[id="businessName"]', 'Toko Master Tes');
		await page.click('button[type="submit"]');

		await expect(page.locator('h1', { hasText: 'Halo' })).toBeVisible({ timeout: 10000 });
	});

	test('TC-MST-01: Tambah Pemasok (Supplier)', async ({ page }) => {
		await page.goto('/suppliers/new');
		await page.fill('input#name', 'PT Pemasok Sukses');
		await page.fill('input#phone', '081234567890');
		await page.fill('textarea#address', 'Jl. Industri No 123');
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/suppliers');
		await expect(page.locator('text=PT Pemasok Sukses')).toBeVisible();
	});

	test('TC-MST-02: Tambah Pelanggan (Customer)', async ({ page }) => {
		await page.goto('/customers/new');
		await page.fill('input#name', 'Budi Pelanggan');
		await page.fill('input#phone', '08555555555');
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/customers');
		await expect(page.locator('text=Budi Pelanggan')).toBeVisible();
	});
});
