<script lang="ts">
	let {
		tabs,
		active,
		onSelect
	}: {
		tabs: { key: string; label: string }[];
		active: string;
		onSelect: (key: string) => void;
	} = $props();
</script>

<div class="flex border-b border-border bg-paper overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative shrink-0">
	{#each tabs as tab}
		<button
			onclick={() => onSelect(tab.key)}
			class="flex-1 px-4 py-4 font-bold text-sm transition relative font-grotesk tracking-tight whitespace-nowrap min-h-[52px]
				{active === tab.key ? 'text-brand' : 'text-ink-soft hover:text-ink'}"
			aria-pressed={active === tab.key}
		>
			{tab.label}
			{#if active === tab.key}
				<div class="absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-t-full"></div>
			{/if}
		</button>
	{/each}
</div>
