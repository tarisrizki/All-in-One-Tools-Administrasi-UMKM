import { PUBLIC_API_URL } from '$env/static/public';
import { authState, logout, setAuth } from '$lib/stores/auth.svelte';

const API_URL = PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
	skipAuth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

export function getApiUrl(endpoint: string): string {
	const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
	return isAbsolute ? endpoint : `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

async function tryRefreshToken(): Promise<string | null> {
	if (!authState.refreshToken) return null;
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		try {
			const res = await fetch(getApiUrl('/auth/refresh'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refresh_token: authState.refreshToken })
			});
			if (!res.ok) return null;
			const data = await res.json();
			if (!data?.success || !data?.data?.token) return null;

			setAuth(data.data.token, authState.refreshToken, authState.user);
			return data.data.token;
		} catch {
			return null;
		} finally {
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

export async function apiClient<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
	const { skipAuth, headers: customHeaders, ...rest } = options;

	const buildHeaders = () => {
		const headers = new Headers(customHeaders);
		if (!skipAuth && authState.token) {
			headers.set('Authorization', `Bearer ${authState.token}`);
		}
		if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
			headers.set('Content-Type', 'application/json');
		}
		return headers;
	};

	const url = getApiUrl(endpoint);

	// Attempt 1
	let response = await fetch(url, { headers: buildHeaders(), ...rest });

	// 401 + punya refresh token → coba refresh sekali, lalu retry
		if (response.status === 401 && !skipAuth && authState.refreshToken) {
			const newToken = await tryRefreshToken();
			if (newToken) {
				response = await fetch(url, { headers: buildHeaders(), ...rest });
			}
		}

	if (response.status === 401) {
		logout();
		if (typeof window !== 'undefined') {
			window.location.href = '/auth/login';
		}
		throw new Error('Sesi berakhir, silakan login kembali');
	}

	if (response.status === 204) {
		return {} as T;
	}

	const contentType = response.headers.get('content-type');
	if (contentType && contentType.includes('application/json')) {
		const data = await response.json();
		if (!response.ok && data?.error?.message) {
			throw new Error(data.error.message);
		}
		return data as T;
	}

	if (!response.ok) {
		throw new Error(`Request gagal: ${response.status}`);
	}

	return response as unknown as T;
}