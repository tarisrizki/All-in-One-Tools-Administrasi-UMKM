const fs = require('fs');
const htmlContent = fs.readFileSync('c:/Users/Dragon/Portofolio/UMKM/beres-umkm-landing.html', 'utf8');

const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const style = styleMatch ? styleMatch[1] : '';

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
const scriptBody = scriptMatch ? scriptMatch[1] : '';

const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<\/body>/);
let body = bodyMatch ? bodyMatch[1] : '';

// Remove <script> tag from body just in case it's caught
body = body.replace(/<script>[\s\S]*?<\/script>/, '');

// Update login links and CTA links to go to /auth/login
body = body.replace(/href="#" class="([^"]*nav-login[^"]*)"/g, 'href="/auth/login" class="$1"');
body = body.replace(/href="#" class="([^"]*btn-primary open-cta nav-cta-mobile[^"]*)"/g, 'href="/auth/login" class="$1"');
body = body.replace(/href="#" class="([^"]*btn btn-primary btn-sm open-cta[^"]*)"/g, 'href="/auth/login" class="$1"');
body = body.replace(/href="#" class="([^"]*btn btn-primary open-cta[^"]*)"/g, 'href="/auth/login" class="$1"');
body = body.replace(/href="#" class="([^"]*btn btn-light open-cta[^"]*)"/g, 'href="/auth/login" class="$1"');
body = body.replace(/href="#" class="([^"]*btn btn-ghost[^"]*)"/g, 'href="/auth/login" class="$1"');


const svelteContent = `<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		${scriptBody}
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
</svelte:head>

${body}

<style>
${style}
</style>
`;

fs.writeFileSync('c:/Users/Dragon/Portofolio/UMKM/frontend/src/routes/+page.svelte', svelteContent);
console.log('Successfully generated +page.svelte for landing page!');
