<script lang="ts">
	import { setAuth } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { z } from 'zod';
	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { apiClient } from '$lib/utils/api';


	let step = $state(1);

	const registerSchema = z.object({
		phone: z.string().regex(/^(08|628|\+628)\d{6,14}$/, 'Format nomor HP tidak valid (misal: 08...)'),
		password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
		businessName: z.string().min(3, 'Nama Usaha minimal 3 karakter'),
		cfTurnstileResponse: z.string().min(1, 'Selesaikan verifikasi keamanan')
	});
	type RegisterSchema = z.infer<typeof registerSchema>;

	let loading = $state(false);
	let errorMsg = $state('');

	const { form, errors, enhance, validateForm } = superForm<RegisterSchema>(
		// @ts-expect-error zod version mismatch with superforms adapter
		defaults({ phone: '', password: '', businessName: '', cfTurnstileResponse: '' }, zod(registerSchema as any)),
		{
			SPA: true,
			validators: zod(registerSchema as any) as any,
			async onUpdate({ form: f }) {
				if (f.valid) {
					loading = true;
					errorMsg = '';
					try {
						const result = await apiClient('/auth/register', {
							method: 'POST',
							skipAuth: true,
							body: JSON.stringify(f.data)
						});
						if (result.success) {
							setAuth(result.data.token, {
								userId: result.data.userId,
								businessId: result.data.businessId,
								permissions: result.data.permissions
							});
							import('$lib/stores/appMode.svelte').then(m => m.syncAppModeFromServer(result.data.appMode));
							goto('/dashboard');
						} else {
							errorMsg = result.error?.message || 'Gagal mendaftar';
						}
					} catch (err) {
						errorMsg = 'Koneksi ke server gagal';
					} finally {
						loading = false;
					}
				}
			}
		}
	);

	async function nextStep(e: Event) {
		e.preventDefault();
		// Partial validation before step 2
		if ($form.phone.match(/^(08|628|\+628)\d{6,14}$/) && $form.password.length >= 6) {
			step = 2;
			errorMsg = '';
			// We can initialize businessName so the second step validation doesn't immediately fail
			if (!$form.businessName) $form.businessName = 'Toko Baru'; 
		} else {
			errorMsg = 'Format nomor HP tidak valid & Kata sandi minimal 6 karakter';
		}
	}

	onMount(() => {
		(window as any).onTurnstileSuccess = (token: string) => {
			$form.cfTurnstileResponse = token;
		};
	});
</script>

<svelte:head>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-primary p-4 font-sans relative overflow-hidden">
	<!-- Decorative Background Elements -->
	<div class="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
	<div class="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

	<Card.Root class="w-full max-w-sm bg-card border-none shadow-2xl relative z-10 rounded-[22px] overflow-hidden">
		<!-- Decorative Top Bar -->
		<div class="h-2 w-full bg-accent"></div>

		<Card.Header class="pt-6 pb-4">
			<div class="flex justify-between items-center mb-4">
				{#if step === 2}
					<Button variant="ghost" size="sm" onclick={() => (step = 1)} class="text-ink-soft hover:text-ink -ml-3 h-8 rounded-full font-bold">
						← Kembali
					</Button>
				{:else}
					<div></div>
				{/if}
				<span class="text-xs font-mono font-bold bg-muted px-2 py-1 rounded text-ink">{step} / 2</span>
			</div>
			
			<div class="text-center">
				{#if step === 1}
					<div class="mx-auto bg-primary text-white font-grotesk font-bold text-xl w-12 h-12 flex items-center justify-center rounded-xl mb-4 rotate-3 shadow-md">
						BR
					</div>
					<Card.Title class="text-3xl font-bold font-grotesk tracking-tight text-ink">Daftar Akun</Card.Title>
					<Card.Description class="text-ink-soft text-sm mt-2">Mulai kelola usaha Anda dengan mudah</Card.Description>
				{:else}
					<div class="mx-auto bg-accent text-white font-grotesk font-bold text-xl w-12 h-12 flex items-center justify-center rounded-xl mb-4 -rotate-3 shadow-md">
						🏪
					</div>
					<Card.Title class="text-3xl font-bold font-grotesk tracking-tight text-ink">Detail Toko</Card.Title>
					<Card.Description class="text-ink-soft text-sm mt-2">Ceritakan tentang usahamu (untuk nota)</Card.Description>
				{/if}
			</div>
		</Card.Header>

		<Card.Content class="px-8 pb-8">
			{#if errorMsg}
				<div class="bg-destructive/10 text-destructive text-sm p-4 rounded-xl mb-6 border border-destructive/20 font-bold flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-destructive flex-shrink-0"></span>
					{errorMsg}
				</div>
			{/if}

			<form method="POST" use:enhance class="space-y-5">
				{#if step === 1}
					<div class="space-y-2">
						<Label for="phone" class="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">Nomor HP</Label>
						<Input
							type="tel"
							id="phone"
							name="phone"
							bind:value={$form.phone}
							placeholder="08123456789"
							class="h-12 rounded-xl border-border bg-muted/30 focus-visible:ring-primary focus-visible:bg-transparent font-medium { $errors.phone ? 'border-destructive focus-visible:ring-destructive' : '' }"
						/>
						{#if $errors.phone}
							<p class="text-xs text-destructive font-bold">{$errors.phone}</p>
						{/if}
					</div>
					<div class="space-y-2">
						<Label for="password" class="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">Kata Sandi</Label>
						<Input
							type="password"
							id="password"
							name="password"
							bind:value={$form.password}
							placeholder="Min. 6 karakter"
							class="h-12 rounded-xl border-border bg-muted/30 focus-visible:ring-primary focus-visible:bg-transparent font-medium { $errors.password ? 'border-destructive focus-visible:ring-destructive' : '' }"
						/>
						{#if $errors.password}
							<p class="text-xs text-destructive font-bold">{$errors.password}</p>
						{/if}
					</div>

					<Button onclick={nextStep} class="w-full h-12 mt-2 rounded-xl font-bold text-base bg-ink hover:bg-ink-light text-white transition-all duration-300">
						Lanjut Setup Toko
					</Button>
				{:else if step === 2}
					<!-- Hidden inputs to persist step 1 state in DOM if needed by superforms on submit -->
					<input type="hidden" name="phone" value={$form.phone} />
					<input type="hidden" name="password" value={$form.password} />

					<div class="space-y-2">
						<Label for="businessName" class="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">Nama Toko/Usaha</Label>
						<Input
							type="text"
							id="businessName"
							name="businessName"
							bind:value={$form.businessName}
							placeholder="Toko Berkah"
							class="h-12 rounded-xl border-border bg-muted/30 focus-visible:ring-primary focus-visible:bg-transparent font-medium { $errors.businessName ? 'border-destructive focus-visible:ring-destructive' : '' }"
						/>
						{#if $errors.businessName}
							<p class="text-xs text-destructive font-bold">{$errors.businessName}</p>
						{/if}
					</div>

					<div class="flex flex-col items-center justify-center mt-4">
						<!-- Gunakan testing key Cloudflare 1x00000000000000000000AA jika VITE_TURNSTILE_SITE_KEY belum diatur -->
						<div class="cf-turnstile" data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} data-callback="onTurnstileSuccess"></div>
						{#if $errors.cfTurnstileResponse}
							<p class="text-xs text-destructive font-bold text-center mt-2">{$errors.cfTurnstileResponse}</p>
						{/if}
					</div>

					<Button type="submit" disabled={loading} class="w-full h-12 mt-2 rounded-xl font-bold text-base bg-accent hover:bg-destructive text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all duration-300">
						{#if loading}
							<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
							Menyimpan...
						{:else}
							Selesai & Buka Kasir
						{/if}
					</Button>
				{/if}

				{#if step === 1}
					<div class="text-center text-sm font-medium text-ink-soft mt-6">
						Sudah punya akun?
						<a href="/auth/login" class="text-primary font-bold hover:underline">Masuk</a>
					</div>
				{/if}
			</form>
		</Card.Content>
	</Card.Root>
</div>
