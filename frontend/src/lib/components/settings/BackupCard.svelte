<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { DatabaseBackup } from '@lucide/svelte';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';

	let backups = $state<any[]>([]);
	let loadingBackups = $state(false);
	let triggeringBackup = $state(false);

	async function loadBackups() {
		loadingBackups = true;
		try {
			const body = await apiClient(`/backup/list`, {
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			if (body.success) {
				backups = body.data;
			}
		} catch (error) {
			console.error(error);
		} finally {
			loadingBackups = false;
		}
	}

	async function triggerBackup() {
		triggeringBackup = true;
		try {
			const res = await apiClient(`/backup/trigger`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${authState.token}` }
			});
			if (res.ok) {
				toast.success('Pencadangan sedang diproses (berjalan di latar belakang)');
				setTimeout(loadBackups, 3000);
			} else {
				toast.error('Gagal memicu pencadangan');
			}
		} catch {
			toast.error('Terjadi kesalahan jaringan');
		} finally {
			triggeringBackup = false;
		}
	}

	async function restoreBackup(fileName: string) {
		if (!confirm(`Peringatan! Memulihkan data dari ${fileName} akan MENIMPA seluruh database saat ini. Lanjutkan?`)) return;

		const toastId = toast.loading('Memulihkan data...');
		try {
			const res = await apiClient(`/backup/restore`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({ fileName })
			});
			if (res.ok) {
				toast.success('Data berhasil dipulihkan', { id: toastId });
			} else {
				const body = await res.json();
				toast.error(body.error?.message || 'Gagal memulihkan data', { id: toastId });
			}
		} catch {
			toast.error('Terjadi kesalahan jaringan', { id: toastId });
		}
	}

	onMount(() => {
		loadBackups();
	});
</script>

<Card.Root class="bg-paper shadow-sm border-border rounded-2xl overflow-hidden relative">
	<div
		class="absolute top-0 right-10 w-8 h-4 bg-surface rounded-b-full border-b border-l border-r border-border"
	></div>

	<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
		<Card.Title class="flex items-center gap-2 font-grotesk text-ink text-xl">
			<DatabaseBackup class="w-5 h-5 text-brand" />
			Pencadangan Data
		</Card.Title>
		<Card.Description class="text-ink-soft text-sm"
			>Cadangkan database secara manual atau pulihkan data dari file cadangan.</Card.Description
		>
	</Card.Header>
	<Card.Content class="pt-6">
		<div class="space-y-4">
			<Button
				onclick={triggerBackup}
				disabled={triggeringBackup}
				class="w-full font-bold h-12 rounded-xl bg-ink hover:bg-ink-soft text-white shadow-md hover:-translate-y-0.5 transition-all gap-2"
			>
				{#if triggeringBackup}
					<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					Memproses...
				{:else}
					Buat Cadangan Baru
				{/if}
			</Button>

			<div class="mt-6 border-2 border-dashed border-border/60 rounded-xl p-4 bg-muted/30">
				<h3 class="font-bold text-xs uppercase tracking-widest font-mono text-ink mb-4">
					Daftar Cadangan Tersedia
				</h3>
				{#if loadingBackups}
					<p class="text-xs font-mono uppercase tracking-widest text-ink-soft text-center py-6 animate-pulse">
						Memuat...
					</p>
				{:else if backups.length === 0}
					<p class="text-xs font-mono text-ink-soft text-center py-6">Belum ada cadangan data</p>
				{:else}
					<div class="space-y-3 max-h-48 overflow-y-auto pr-2 [scrollbar-width:thin]">
						{#each backups as backup}
							<div
								class="flex items-center justify-between p-3 bg-paper border border-border rounded-xl shadow-sm hover:border-brand/50 transition-colors"
							>
								<div>
									<p class="font-mono text-sm font-bold text-ink">{backup.name}</p>
									<p class="text-[10px] text-ink-soft mt-1 uppercase tracking-widest font-mono">
										{(backup.size / 1024).toFixed(1)} KB &bull; {new Date(backup.createdAt).toLocaleString('id-ID')}
									</p>
								</div>
								<Button
									variant="destructive"
									size="sm"
									class="text-[10px] uppercase tracking-widest px-3 h-8 rounded-full font-bold shadow-md"
									onclick={() => restoreBackup(backup.name)}
								>
									Pulihkan
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>
