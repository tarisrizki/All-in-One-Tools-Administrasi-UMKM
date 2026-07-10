import { apiClient } from '$lib/utils/api';

export type AppMode = 'simple' | 'full';

export const appModeState = $state({
	mode: 'full' as AppMode
});

export async function setAppMode(mode: AppMode) {
	appModeState.mode = mode;
	
	// Save to localStorage for immediate persistence across reloads
	if (typeof window !== 'undefined') {
		localStorage.setItem('umkm_app_mode', mode);
	}

	try {
		await apiClient('/settings/app-mode', {
			method: 'PATCH',
			body: JSON.stringify({ mode })
		});
	} catch (e) {
		console.error("Gagal menyimpan preferensi mode aplikasi", e);
	}
}

export function loadAppModeFromStorage() {
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem('umkm_app_mode');
		if (saved === 'simple' || saved === 'full') {
			appModeState.mode = saved;
		}
	}
}

export function syncAppModeFromServer(serverMode: AppMode) {
	appModeState.mode = serverMode;
	if (typeof window !== 'undefined') {
		localStorage.setItem('umkm_app_mode', serverMode);
	}
}
