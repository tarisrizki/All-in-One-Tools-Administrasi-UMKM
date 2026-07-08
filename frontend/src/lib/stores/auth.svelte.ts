export const authState = $state({
	user: null as any | null,
	token: null as string | null,
	isAuthenticated: false
});

export function setAuth(token: string, user: any) {
	authState.token = token;
	authState.user = user;
	authState.isAuthenticated = true;

	// Save to localStorage for persistence
	if (typeof window !== 'undefined') {
		localStorage.setItem('umkm_token', token);
		localStorage.setItem('umkm_user', JSON.stringify(user));
	}
}

export function logout() {
	authState.token = null;
	authState.user = null;
	authState.isAuthenticated = false;

	if (typeof window !== 'undefined') {
		localStorage.removeItem('umkm_token');
		localStorage.removeItem('umkm_user');
	}
}

export function loadAuthFromStorage() {
	if (typeof window !== 'undefined') {
		const token = localStorage.getItem('umkm_token');
		const userStr = localStorage.getItem('umkm_user');

		if (token && userStr) {
			try {
				const user = JSON.parse(userStr);
				authState.token = token;
				authState.user = user;
				authState.isAuthenticated = true;
			} catch (e) {
				// Ignore parse error
			}
		}
	}
}
