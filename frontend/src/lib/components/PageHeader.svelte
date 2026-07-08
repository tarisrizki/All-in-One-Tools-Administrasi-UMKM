<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		backHref = '/dashboard',
		actions
	}: {
		title: string;
		subtitle?: string;
		backHref?: string;
		actions?: Snippet;
	} = $props();
</script>

<header
	class="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-border shadow-sm shrink-0"
>
	<div class="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
		<div class="flex items-center gap-3 min-w-0">
			<Button
				variant="ghost"
				size="icon"
				href={backHref}
				class="rounded-full hover:bg-muted text-ink-soft hover:text-ink shrink-0"
				aria-label="Kembali"
			>
				<ArrowLeft class="w-5 h-5" />
			</Button>
			<div class="min-w-0">
				<h1 class="text-lg font-bold font-grotesk text-ink tracking-tight truncate">{title}</h1>
				{#if subtitle}
					<p class="text-[10px] font-mono text-ink-soft uppercase tracking-widest hidden sm:block">
						{subtitle}
					</p>
				{/if}
			</div>
		</div>
		{#if actions}
			<div class="shrink-0 flex items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>
