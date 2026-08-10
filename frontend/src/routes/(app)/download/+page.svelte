<script lang="ts">import favicon from '$lib/assets/favicon.svg';</script>
<svelte:head><link rel="icon" href={favicon} /><title>Download — Beres</title></svelte:head>
<main class="min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
	<h1 class="font-grotesk text-3xl font-bold text-ink mb-3">Download Beres</h1>
	<p class="text-ink-soft max-w-xl mb-6">Versi desktop Windows (.exe) via Flutter. Build dari CI Releases — placeholder sampai Tauri→Flutter APK/exe fully migrated.</p>
	<a href="https://github.com/tarisrizki/All-in-One-Tools-Administrasi-UMKM/releases" class="inline-flex rounded-xl bg-cta px-8 py-3 text-base font-bold text-white hover:opacity-90">Buka Releases (.exe)</a>
	<p class="text-xs text-ink-soft mt-4">ponytail: ganti href ke artefact release setelah Flutter Windows build stabil.</p>
</main>
