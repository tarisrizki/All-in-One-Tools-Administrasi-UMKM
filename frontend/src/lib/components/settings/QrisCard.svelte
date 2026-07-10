<script lang="ts">
	import { apiClient } from '$lib/utils/api';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { QrCode, UploadCloud, Loader2 } from '@lucide/svelte';
	import { authState } from '$lib/stores/auth.svelte';

	let qrisUrl = $state<string | null>(null);
	let loading = $state(true);
	let uploading = $state(false);

	$effect(() => {
		async function fetchQris() {
			try {
				const res = await apiClient<{ success: boolean; data: { qrisUrl: string | null } }>(
					'/settings/qris',
					{
						headers: { Authorization: `Bearer ${authState.token}` }
					}
				);
				if (res.success && res.data) {
					qrisUrl = res.data.qrisUrl;
				}
			} catch (e) {
				console.error('Failed to fetch QRIS URL', e);
			} finally {
				loading = false;
			}
		}
		fetchQris();
	});

	async function uploadFile(file: File) {
		uploading = true;
		const formData = new FormData();
		formData.append('file', file);
		formData.append('type', 'qris');
		try {
			const res = await apiClient<{ success: boolean; data: { url: string } }>(
				`/settings/upload`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${authState.token}` },
					body: formData
				}
			);
			if (res.success && res.data) {
				qrisUrl = res.data.url;
				toast.success('Gambar QRIS berhasil diunggah');
			} else {
				toast.error('Gagal mengunggah gambar QRIS');
			}
		} catch {
			toast.error('Terjadi kesalahan jaringan');
		} finally {
			uploading = false;
		}
	}

	function handleFileChange(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) uploadFile(file);
	}
</script>

<Card.Root class="bg-paper shadow-sm border-border rounded-2xl overflow-hidden relative">
	<div
		class="absolute top-0 right-10 w-8 h-4 bg-surface rounded-b-full border-b border-l border-r border-border"
	></div>

	<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
		<Card.Title class="flex items-center gap-2 font-grotesk text-ink text-xl">
			<QrCode class="w-5 h-5 text-brand" />
			QRIS Toko (Statis)
		</Card.Title>
		<Card.Description class="text-ink-soft text-sm">
			Unggah gambar QRIS toko Anda untuk ditampilkan saat pelanggan membayar menggunakan metode QRIS di kasir (POS).
		</Card.Description>
	</Card.Header>
	<Card.Content class="pt-6">
		<div class="space-y-4">
			{#if loading}
				<div class="flex items-center justify-center p-8 bg-muted rounded-xl border border-dashed border-border/60">
					<Loader2 class="w-8 h-8 text-ink-soft animate-spin" />
				</div>
			{:else}
				{#if qrisUrl}
					<div class="p-4 bg-muted rounded-xl border border-border/50 flex flex-col items-center gap-4">
						<div class="relative w-48 h-48 bg-white p-2 rounded-xl shadow-sm border border-border">
							<img src={qrisUrl} alt="QRIS Toko" class="w-full h-full object-contain rounded-lg" />
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					<label class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono" for="qrisUpload">
						{qrisUrl ? 'Ubah Gambar QRIS' : 'Unggah Gambar QRIS'}
					</label>
					<div class="relative">
						<input
							id="qrisUpload"
							type="file"
							accept="image/png, image/jpeg"
							class="flex h-11 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand file:border-0 file:bg-muted file:text-ink file:px-3 file:py-1 file:rounded-md file:text-xs file:font-bold file:mr-4 font-mono disabled:opacity-50"
							onchange={handleFileChange}
							disabled={uploading}
						/>
						{#if uploading}
							<div class="absolute right-3 top-1/2 -translate-y-1/2">
								<Loader2 class="w-5 h-5 text-brand animate-spin" />
							</div>
						{/if}
					</div>
					<p class="text-[10px] text-ink-soft font-mono">Format JPG/PNG, ukuran maksimal 300KB.</p>
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
