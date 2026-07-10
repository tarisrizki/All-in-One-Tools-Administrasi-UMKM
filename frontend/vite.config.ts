import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'development',
			strategies: 'generateSW',
			/* FIX (desain "masih jelek" & terasa lambat): devOptions.enabled=true
			   membuat service worker aktif & mem-precache asset bahkan saat dev.
			   Efeknya: setelah kode diubah, browser masih bisa menyajikan CSS/JS
			   LAMA dari cache SW — persis gejala di screenshot (padding, warna,
			   posisi ikon tidak sesuai kode terbaru). SW tetap otomatis aktif
			   penuh di build production (strategies: generateSW di atas tidak
			   berubah) — ini HANYA menonaktifkan SW selama development lokal.
			   Kalau sebelumnya sempat mengaktifkan SW versi lama: buka DevTools
			   → Application → Service Workers → Unregister, lalu hard refresh. */
			devOptions: {
				enabled: false,
				type: 'module',
				navigateFallback: '/'
			},
			manifest: {
				short_name: 'UMKM Tools',
				name: 'All-in-One Tools Administrasi UMKM',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				theme_color: '#0E9F6E',
				background_color: '#FAFAF8',
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	],
	ssr: {
		noExternal: ['@tanstack/svelte-query']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
