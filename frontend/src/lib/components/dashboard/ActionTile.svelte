<script lang="ts">
	let {
		icon,
		label,
		sub = undefined,
		colorClass,
		bgClass,
		size = 'md',
		onClick = undefined,
		href = undefined
	}: {
		icon: any;
		label: string;
		sub?: string;
		colorClass: string;
		bgClass: string;
		size?: 'md' | 'lg';
		onClick?: () => void;
		href?: string;
	} = $props();

	let Icon = $derived(icon);
	let hClass = $derived(size === 'lg' ? 'h-[108px]' : 'h-[88px]');
	let iconSize = $derived(size === 'lg' ? 30 : 26);
	let labelClass = $derived(size === 'lg' ? 'text-[17px]' : 'text-[15px]');
</script>

{#if href}
	<a
		{href}
		class="w-full text-left {bgClass} rounded-[20px] {hClass} px-5 flex flex-col items-start justify-center gap-1 cursor-pointer border-none shadow-[0_1px_2px_rgba(20,22,45,0.06)] hover:brightness-95 transition-all"
	>
		<Icon size={iconSize} class={colorClass} strokeWidth={2} />
		<span class="font-grotesk font-bold {labelClass} text-ink leading-tight">{label}</span>
		{#if sub}
			<span class="font-sans text-[12.5px] text-ink-soft leading-none">{sub}</span>
		{/if}
	</a>
{:else}
	<button
		type="button"
		onclick={onClick}
		class="w-full text-left {bgClass} rounded-[20px] {hClass} px-5 flex flex-col items-start justify-center gap-1 cursor-pointer border-none shadow-[0_1px_2px_rgba(20,22,45,0.06)] hover:brightness-95 transition-all"
	>
		<Icon size={iconSize} class={colorClass} strokeWidth={2} />
		<span class="font-grotesk font-bold {labelClass} text-ink leading-tight">{label}</span>
		{#if sub}
			<span class="font-sans text-[12.5px] text-ink-soft leading-none">{sub}</span>
		{/if}
	</button>
{/if}
