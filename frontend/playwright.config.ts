import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run preview -- --port 4173 --host 127.0.0.1',
		port: 4173,
		reuseExistingServer: true,
		timeout: 60_000,
	},
	testMatch: '**/*.e2e.{ts,js}',
	testDir: 'tests',
	timeout: 45_000,
	expect: { timeout: 12_000 },
	retries: 0,
	workers: 1,
	fullyParallel: false,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'off',
	},
});
