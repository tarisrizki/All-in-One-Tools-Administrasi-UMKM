<script lang="ts">
	import { authState, logout, hasPermission } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { LogOut } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import StoreProfileCard from '$lib/components/settings/StoreProfileCard.svelte';
	import QrisCard from '$lib/components/settings/QrisCard.svelte';
	import AppModeCard from '$lib/components/settings/AppModeCard.svelte';
	import PrinterCard from '$lib/components/settings/PrinterCard.svelte';
	import DocumentCard from '$lib/components/settings/DocumentCard.svelte';
	import BackupCard from '$lib/components/settings/BackupCard.svelte';
	import RoleSettingsCard from '$lib/components/settings/RoleSettingsCard.svelte';

	function handleLogout() {
		if (confirm('Apakah Anda yakin ingin keluar?')) {
			logout();
			goto('/auth/login');
		}
	}
</script>

<svelte:head>
	<title>Pengaturan — Beres</title>
</svelte:head>

<div class="min-h-screen bg-surface pb-20 font-sans flex flex-col">
	<PageHeader title="Pengaturan" subtitle="Konfigurasi Toko" />

	<main class="p-4 sm:p-6 space-y-6 container-base mt-4 flex-1">
		<StoreProfileCard />
		<QrisCard />
		<AppModeCard />
		<PrinterCard />

		<RoleSettingsCard />

		{#if hasPermission('settings.manage')}
			<DocumentCard />
			<BackupCard />
		{/if}

		<!-- Logout Button -->
		<div class="pt-4">
			<Button
				variant="outline"
				onclick={handleLogout}
				class="w-full font-bold h-12 rounded-xl border-dashed border-danger/50 text-danger hover:bg-danger hover:text-white transition-all shadow-sm gap-2"
				size="lg"
			>
				<LogOut class="w-5 h-5" />
				Keluar Akun
			</Button>
		</div>
	</main>
</div>
