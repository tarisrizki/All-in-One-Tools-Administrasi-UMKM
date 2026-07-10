<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { LayoutTemplate, Sparkles } from '@lucide/svelte';
	import { appModeState, setAppMode } from '$lib/stores/appMode.svelte';
</script>

<Card.Root class="bg-paper shadow-sm border-border rounded-2xl overflow-hidden">
	<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
		<Card.Title class="flex items-center gap-2 font-grotesk text-ink text-xl">
			<LayoutTemplate class="w-5 h-5 text-brand" />
			Tampilan Aplikasi
		</Card.Title>
		<Card.Description class="text-ink-soft text-sm">
			Sesuaikan antarmuka Beres UMKM sesuai kebutuhan Anda.
		</Card.Description>
	</Card.Header>
	<Card.Content class="pt-6">
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<button
				type="button"
				class="relative p-5 rounded-xl border-2 text-left transition-all duration-300 min-h-0 cursor-pointer {appModeState.mode === 'simple' ? 'border-brand bg-brand/5 shadow-md' : 'border-border/50 bg-muted/30 hover:border-brand/30 hover:bg-muted/50'}"
				onclick={() => setAppMode('simple')}
			>
				{#if appModeState.mode === 'simple'}
					<div class="absolute top-4 right-4 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
						<div class="w-2 h-2 bg-white rounded-full"></div>
					</div>
				{/if}
				<div class="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-3">
					<Sparkles class="w-5 h-5 text-brand" />
				</div>
				<h3 class="font-bold text-ink mb-1 font-grotesk text-lg">Sederhana</h3>
				<p class="text-xs text-ink-soft leading-relaxed">
					Tampilan difokuskan pada kasir dan menu-menu utama. Cocok untuk mempercepat pelayanan.
				</p>
			</button>

			<button
				type="button"
				class="relative p-5 rounded-xl border-2 text-left transition-all duration-300 min-h-0 cursor-pointer {appModeState.mode === 'full' ? 'border-brand bg-brand/5 shadow-md' : 'border-border/50 bg-muted/30 hover:border-brand/30 hover:bg-muted/50'}"
				onclick={() => setAppMode('full')}
			>
				{#if appModeState.mode === 'full'}
					<div class="absolute top-4 right-4 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
						<div class="w-2 h-2 bg-white rounded-full"></div>
					</div>
				{/if}
				<div class="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-3">
					<LayoutTemplate class="w-5 h-5 text-brand" />
				</div>
				<h3 class="font-bold text-ink mb-1 font-grotesk text-lg">Lengkap</h3>
				<p class="text-xs text-ink-soft leading-relaxed">
					Menampilkan semua fitur bisnis termasuk manajemen tim, pelanggan, dan fitur AI (beta).
				</p>
			</button>
		</div>
	</Card.Content>
</Card.Root>
