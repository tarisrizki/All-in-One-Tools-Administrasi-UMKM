<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { FileImage, Store } from 'lucide-svelte';
	import { authState } from '$lib/stores/auth.svelte';

	async function uploadFile(file: File, type: 'stamp' | 'signature') {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('type', type);
		try {
			const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
			const res = await fetch(`${API_URL}/v1/settings/upload`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${authState.token}` },
				body: formData
			});
			if (res.ok) {
				toast.success(type === 'stamp' ? 'Stempel berhasil diunggah' : 'Tanda tangan berhasil diunggah');
			} else {
				toast.error(`Gagal mengunggah ${type === 'stamp' ? 'stempel' : 'tanda tangan'}`);
			}
		} catch {
			toast.error('Terjadi kesalahan jaringan');
		}
	}

	function handleFileChange(e: Event, type: 'stamp' | 'signature') {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) uploadFile(file, type);
	}
</script>

<Card.Root class="bg-paper shadow-sm border-border rounded-2xl overflow-hidden relative">
	<div
		class="absolute top-0 right-10 w-8 h-4 bg-surface rounded-b-full border-b border-l border-r border-border"
	></div>

	<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
		<Card.Title class="flex items-center gap-2 font-grotesk text-ink text-xl">
			<Store class="w-5 h-5 text-brand" />
			Dokumen Digital
		</Card.Title>
		<Card.Description class="text-ink-soft text-sm"
			>Unggah stempel dan tanda tangan untuk PDF Invoice/Nota.</Card.Description
		>
	</Card.Header>
	<Card.Content class="pt-6">
		<div class="space-y-4">
			<div class="space-y-2">
				<label
					class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono"
					for="stampUpload">Unggah Stempel Toko</label
				>
				<input
					id="stampUpload"
					type="file"
					accept="image/*"
					class="flex h-11 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand file:border-0 file:bg-muted file:text-ink file:px-3 file:py-1 file:rounded-md file:text-xs file:font-bold file:mr-4 font-mono"
					onchange={(e) => handleFileChange(e, 'stamp')}
				/>
			</div>
			<div class="space-y-2">
				<label
					class="text-xs font-bold uppercase tracking-widest text-ink-soft font-mono"
					for="signatureUpload">Unggah Tanda Tangan Pemilik</label
				>
				<input
					id="signatureUpload"
					type="file"
					accept="image/*"
					class="flex h-11 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand file:border-0 file:bg-muted file:text-ink file:px-3 file:py-1 file:rounded-md file:text-xs file:font-bold file:mr-4 font-mono"
					onchange={(e) => handleFileChange(e, 'signature')}
				/>
			</div>
		</div>
	</Card.Content>
</Card.Root>
