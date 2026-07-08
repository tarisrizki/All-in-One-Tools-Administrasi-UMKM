<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>UMKM Tools — Kasir, Stok & Keuangan dalam Satu Aplikasi</title>
</svelte:head>

{@render children()}
