<script lang="ts">import { authState } from '$lib/stores/auth.svelte'; import favicon from '$lib/assets/favicon.svg';</script>
<svelte:head><link rel="icon" href={favicon} /><title>Profile — Beres</title></svelte:head>
<main class="px-6 py-8 max-w-2xl mx-auto">
	<h1 class="font-grotesk text-2xl font-bold text-ink mb-4">Profile</h1>
	<div class="rounded-xl border border-border bg-paper p-6">
		<div class="text-sm text-ink-soft">Login sebagai</div>
		<div class="font-bold text-ink">{authState.user?.phone ?? authState.user?.email ?? '—'}</div>
		<div class="text-xs text-ink-soft mt-1">Business: {authState.user?.business_id ?? '—'}</div>
	</div>
	<p class="text-xs text-ink-soft mt-4">ponytail: tambah edit profile + ganti password nanti.</p>
</main>
