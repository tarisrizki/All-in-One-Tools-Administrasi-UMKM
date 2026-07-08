<script lang="ts">
	let { message = 'Memuat data...' }: { message?: string } = $props();
</script>

<div class="flex flex-col items-center justify-center p-16 gap-4 text-ink-soft">
	<div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
	<p class="font-mono text-xs uppercase tracking-widest animate-pulse">{message}</p>
</div>
