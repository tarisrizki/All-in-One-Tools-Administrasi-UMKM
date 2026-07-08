import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { authState } from '$lib/stores/auth.svelte';

export async function load({ url }) {
	if (browser) {
		if (!authState.isAuthenticated) {
			throw redirect(302, '/auth/login');
		}
	}
}
