<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let {
		icon: Icon,
		iconClass = '',
		title,
		description,
		actionHref,
		actionLabel
	}: {
		icon?: any;
		iconClass?: string;
		title: string;
		description?: string;
		actionHref?: string;
		actionLabel?: string;
	} = $props();
</script>

<div
	class="p-16 text-center flex flex-col items-center border-2 border-dashed border-border/60 rounded-2xl m-6 bg-paper-alt"
>
	{#if Icon}
		<div
			class="w-16 h-16 bg-brand-soft text-brand rounded-2xl flex items-center justify-center mb-4 rotate-3 {iconClass}"
		>
			<Icon class="w-8 h-8" />
		</div>
	{/if}
	<p class="font-bold text-lg font-grotesk text-ink mb-1">{title}</p>
	{#if description}
		<p class="text-sm text-ink-soft mb-6 max-w-sm mx-auto">{description}</p>
	{/if}
	{#if actionHref && actionLabel}
		<Button
			variant="outline"
			href={actionHref}
			class="rounded-xl border-dashed border-border text-ink hover:text-brand hover:border-brand"
		>
			{actionLabel}
		</Button>
	{/if}
</div>

