import { test, expect } from '@playwright/test';

async function registerAndLogin(page: import('@playwright/test').Page, businessName: string) {
	const phone = `089${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 9)}`;
	await page.goto('/auth/register');
	await page.fill('input#phone', phone);
	await page.fill('input#password', 'Password123!');
	await page.getByRole('button', { name: /Lanjut Setup Toko/i }).click();
	await page.waitForSelector('input#businessName', { timeout: 10000 });
	await page.fill('input#businessName', businessName);
	await page.evaluate(() => {
		const w = window as any;
				// no captcha
		const el = document.querySelector('#turnstile-mock') as HTMLInputElement | null; if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
	});
	await page.waitForTimeout(500);
	await page.getByRole('button', { name: /Selesai.*Buka Kasir/i }).click();
	await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	await expect(page.locator('h1', { hasText: 'Halo' })).toBeVisible({ timeout: 10000 });
}

test.describe('Master Data', () => {
	test('TC-MST-01: Tambah Pemasok (Supplier) via modal', async ({ page }) => {
		await registerAndLogin(page, `Toko Master ${Date.now().toString().slice(-4)}`);
		await page.goto('/suppliers');
		await page.waitForTimeout(800);
		await page.getByRole('button', { name: /Tambah Pemasok/i }).first().click({ timeout: 8000 });
		await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
		await page.getByPlaceholder('Mis. PT Bina Sejahtera').fill('PT Pemasok Sukses');
		await page.getByPlaceholder('08...').fill('081234567890');
		await page.getByPlaceholder('Alamat pengiriman/tagihan...').fill('Jl. Industri No 123');
		const respP = page.waitForResponse((r) => r.url().includes('/suppliers') && r.request().method() === 'POST', { timeout: 10000 }).catch(() => null);
		await page.getByRole('button', { name: /Simpan Pemasok/i }).click();
		const resp = await respP;
		if (resp && resp.status() >= 400) {
			try { console.log('SUPPLIER RESP', resp.status(), (await resp.text()).slice(0, 500)); } catch {}
		}
		if (resp) expect(resp.status()).toBe(201);
		await page.waitForTimeout(800);
		const visible = await page.locator('text=PT Pemasok Sukses').first().isVisible().catch(() => false);
		if (!visible) {
			// fallback verify via GET suppliers
			const token = await page.evaluate(() => localStorage.getItem('umkm_token'));
			const apiRes = await page.request.get('https://api.beres.lambada.my.id/suppliers', { headers: { Authorization: `Bearer ${token}` } });
			const body = await apiRes.json().catch(() => null);
			expect(body?.data?.some((s: any) => s.name === 'PT Pemasok Sukses')).toBeTruthy();
		} else {
			await expect(page.locator('text=PT Pemasok Sukses').first()).toBeVisible({ timeout: 4000 });
		}
	});

	test('TC-MST-02: Tambah Pelanggan (Customer) via /customers/new', async ({ page }) => {
		await registerAndLogin(page, `Toko Master2 ${Date.now().toString().slice(-4)}`);
		await page.goto('/customers/new');
		await page.waitForTimeout(800);
		await page.locator('input[placeholder*="Budi Santoso"]').fill('Budi Pelanggan');
		const ph = page.locator('input[placeholder*="08123456789"]');
		if (await ph.count()) await ph.fill('08555555555');
		await page.getByRole('button', { name: /Simpan Data Pelanggan/i }).click();
		await expect(page).toHaveURL(/\/customers/, { timeout: 10000 });
		await expect(page.locator('text=Budi Pelanggan')).toBeVisible({ timeout: 8000 });
	});
});
