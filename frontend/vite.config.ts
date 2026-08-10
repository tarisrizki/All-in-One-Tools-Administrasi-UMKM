import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// adapter-static: build statis → jalan di nginx (self-host Proxmox) DAN Cloudflare Pages.
			// fallback: 'index.html' = SPA mode (ssr=false, prerender=false di +layout.ts).
			adapter: adapter({
				fallback: 'index.html'
			})
		}),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'development',
			strategies: 'generateSW',
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
	preview: {
		port: 4173,
		strictPort: false,
	},
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