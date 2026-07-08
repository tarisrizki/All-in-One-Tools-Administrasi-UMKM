<script lang="ts">
	// Root Layout (No auth guard, just CSS)
	import './layout.css';
	import './shadcn.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Beres | All-in-One Tools Administrasi UMKM</title>
</svelte:head>

<!-- Toaster or other global components can go here if needed -->
{@render children()}
