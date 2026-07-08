import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { authState, loadAuthFromStorage } from '$lib/stores/auth.svelte';

export const ssr = false;
export const prerender = false;

export async function load({ url }) {
	if (browser) {
		loadAuthFromStorage();
		const isAuthRoute = url.pathname.startsWith('/auth');

		// Jika sudah login, jangan biarkan kembali ke halaman auth atau landing page
		if (authState.isAuthenticated && (isAuthRoute || url.pathname === '/')) {
			throw redirect(302, '/dashboard');
		}
	}
}
