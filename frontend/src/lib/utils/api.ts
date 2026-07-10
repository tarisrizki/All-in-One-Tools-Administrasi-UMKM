import { env } from '$env/dynamic/public';
import { authState, logout } from '$lib/stores/auth.svelte';

const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
	skipAuth?: boolean;
}

export function getApiUrl(endpoint: string): string {
	const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
	return isAbsolute ? endpoint : `${API_URL}/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

export async function apiClient<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
	const { skipAuth, headers: customHeaders, ...rest } = options;

	const headers = new Headers(customHeaders);

	if (!skipAuth && authState.token) {
		headers.set('Authorization', `Bearer ${authState.token}`);
	}

	if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
		headers.set('Content-Type', 'application/json');
	}

	const url = getApiUrl(endpoint);

	const response = await fetch(url, { headers, ...rest });

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
		return data as T;
	}

	return response as unknown as T;
}
