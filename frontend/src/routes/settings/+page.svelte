<script lang="ts">
	import { authState, logout } from '$lib/stores/auth.svelte';
	import { connectPrinter, isPrinterConnected, printText } from '$lib/utils/printer';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, Bluetooth, LogOut, Printer, Store, User } from 'lucide-svelte';

	let printerStatus = $state(isPrinterConnected() ? 'Terhubung' : 'Terputus');
	let connecting = $state(false);

	async function handleConnectPrinter() {
		connecting = true;
		try {
			await connectPrinter();
			printerStatus = 'Terhubung';
			toast.success('Printer berhasil dihubungkan!');
		} catch (e: any) {
			toast.error('Gagal menghubungkan printer: ' + e.message);
		} finally {
			connecting = false;
		}
	}

	async function handleTestPrint() {
		try {
			await printText('TES PRINTER UMKM\nBerhasil Terhubung!\n\n\n');
			toast.success('Struk tes sedang dicetak');
		} catch (e: any) {
			toast.error('Gagal mencetak: ' + e.message);
		}
	}

	function handleLogout() {
		if (confirm('Apakah Anda yakin ingin keluar?')) {
			logout();
			goto('/auth/login');
		}
	}
</script>

<svelte:head>
	<title>Pengaturan | UMKM Tools</title>
</svelte:head>

<div class="min-h-screen bg-muted/40 pb-20">
	<header class="bg-background px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
		<Button variant="ghost" size="icon" href="/">
			<ArrowLeft class="w-5 h-5" />
		</Button>
		<h1 class="text-xl font-bold">Pengaturan</h1>
	</header>

	<main class="p-4 space-y-6 max-w-2xl mx-auto mt-4">
		<!-- Profil Toko -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Store class="w-5 h-5 text-primary" />
					Profil Toko
				</Card.Title>
				<Card.Description>Informasi akun dan akses Anda saat ini.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="flex justify-between items-center border-b pb-4">
						<div class="flex items-center gap-3">
							<div class="bg-muted p-2 rounded-full">
								<Store class="w-4 h-4 text-muted-foreground" />
							</div>
							<div>
								<p class="text-sm font-medium leading-none">ID Toko</p>
								<p class="text-sm text-muted-foreground mt-1">Identitas unik usaha Anda</p>
							</div>
						</div>
						<span class="font-bold font-mono">{authState.user?.businessId || 'N/A'}</span>
					</div>
					<div class="flex justify-between items-center pb-2">
						<div class="flex items-center gap-3">
							<div class="bg-muted p-2 rounded-full">
								<User class="w-4 h-4 text-muted-foreground" />
							</div>
							<div>
								<p class="text-sm font-medium leading-none">Peran Akses</p>
								<p class="text-sm text-muted-foreground mt-1">Level hak akses sistem</p>
							</div>
						</div>
						<Badge variant="secondary" class="capitalize">{authState.user?.roleId || 'N/A'}</Badge>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Pengaturan Printer -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Printer class="w-5 h-5 text-primary" />
					Printer Thermal (Bluetooth)
				</Card.Title>
				<Card.Description>Koneksikan printer struk kasir via Bluetooth.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="bg-blue-50 text-blue-800 p-3 rounded-md text-xs border border-blue-100 mb-6 flex gap-2">
					<div class="mt-0.5"><Bluetooth class="w-4 h-4" /></div>
					<p>Fitur pencetakan ini memerlukan perangkat dengan dukungan Web Bluetooth (Chrome/Edge di Desktop atau Android).</p>
				</div>

				<div class="flex justify-between items-center mb-6 border-b pb-4">
					<span class="text-sm font-medium">Status Koneksi</span>
					{#if printerStatus === 'Terhubung'}
						<Badge class="bg-green-600 hover:bg-green-700">Terhubung</Badge>
					{:else}
						<Badge variant="outline" class="text-amber-600 border-amber-200 bg-amber-50">Terputus</Badge>
					{/if}
				</div>

				<div class="space-y-3">
					<Button
						onclick={handleConnectPrinter}
						disabled={connecting}
						class="w-full font-bold"
					>
						<Bluetooth class="w-4 h-4 mr-2" />
						{#if connecting}
							Mencari Perangkat...
						{:else}
							Cari & Hubungkan Printer
						{/if}
					</Button>

					{#if printerStatus === 'Terhubung'}
						<Button
							variant="outline"
							onclick={handleTestPrint}
							class="w-full font-bold"
						>
							<Printer class="w-4 h-4 mr-2" />
							Tes Cetak Struk
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Akun -->
		<div class="pt-4">
			<Button
				variant="destructive"
				onclick={handleLogout}
				class="w-full font-bold"
				size="lg"
			>
				<LogOut class="w-5 h-5 mr-2" />
				Keluar (Logout)
			</Button>
		</div>
	</main>
</div>
