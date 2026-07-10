<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { setAuth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { z } from 'zod';
	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 as zod } from 'sveltekit-superforms/adapters';
	import { apiClient } from '$lib/utils/api';


	const DEMO_PHONE = '08123456789';
	const DEMO_PASS = 'demo123';

	const loginSchema = z.object({
		phone: z.string().min(10, 'Nomor HP minimal 10 digit').regex(/^[0-9]+$/, 'Hanya boleh berisi angka'),
		password: z.string().min(6, 'Password minimal 6 karakter')
	});
	type LoginSchema = z.infer<typeof loginSchema>;

	let loading = $state(false);
	let errorMsg = $state('');

	const { form, errors, enhance } = superForm<LoginSchema>(
		// @ts-expect-error zod version mismatch
		defaults({ phone: '', password: '' }, zod(loginSchema as any)),
		{
			SPA: true,
			validators: zod(loginSchema as any) as any,
			async onUpdate({ form: f }) {
				if (f.valid) {
					loading = true;
					errorMsg = '';
					try {
						const result = await apiClient('/auth/login', {
							method: 'POST',
							skipAuth: true,
							body: JSON.stringify(f.data)
						});
						if (result.success) {
							setAuth(result.data.token, {
								userId: result.data.userId,
								businessId: result.data.businessId
							});
							goto('/dashboard');
						} else {
							errorMsg = result.error?.message || 'Login gagal';
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

	function fillDemo() {
		$form.phone = DEMO_PHONE;
		$form.password = DEMO_PASS;
	}
</script>

<svelte:head>
	<title>Masuk — Beres UMKM</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden" style="background: var(--color-brand)">
	<div class="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl" style="background: rgba(255,255,255,.05)"></div>
	<div class="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl" style="background: rgba(255,255,255,.05)"></div>

	<div class="w-full max-w-sm relative z-10">
		<div class="text-center mb-6">
			<a href="/" class="font-mono text-sm font-semibold hover:text-white transition-colors min-h-0 inline-flex items-center gap-1.5" style="color: rgba(255,255,255,.7)">
				← Kembali ke Beranda
			</a>
		</div>

		<Card.Root class="bg-paper border-none shadow-2xl rounded-[22px] overflow-hidden">
			<div class="h-1.5 w-full" style="background: var(--color-cta)"></div>

			<Card.Header class="text-center pt-8 pb-4">
				<div class="mx-auto text-white font-grotesk font-bold text-xl w-12 h-12 flex items-center justify-center rounded-xl mb-4 -rotate-6 shadow-md" style="background: var(--color-brand)">
					B
				</div>
				<Card.Title class="text-2xl font-bold font-grotesk tracking-tight text-ink">Masuk ke Beres</Card.Title>
				<Card.Description class="text-ink-soft text-sm mt-1.5">Kelola usahamu dari mana saja</Card.Description>
			</Card.Header>

			<Card.Content class="px-8 pb-8">
				<!-- Demo credentials banner -->
				<button
					type="button"
					onclick={fillDemo}
					class="w-full bg-brand-soft border border-brand/20 rounded-xl p-3.5 mb-6 text-left hover:bg-brand/10 transition-colors cursor-pointer min-h-0"
				>
					<p class="font-mono text-[10.5px] font-bold text-brand uppercase tracking-wider mb-1.5">✨ Akun Demo — Klik untuk isi otomatis</p>
					<div class="flex gap-4">
						<span class="text-xs text-ink-soft">📱 <span class="font-mono font-bold text-ink">{DEMO_PHONE}</span></span>
						<span class="text-xs text-ink-soft">🔑 <span class="font-mono font-bold text-ink">{DEMO_PASS}</span></span>
					</div>
				</button>

				{#if errorMsg}
					<div class="text-sm p-4 rounded-xl mb-6 border font-bold flex items-center gap-2" style="background: rgba(221,75,30,.1); color: var(--color-cta); border-color: rgba(221,75,30,.2)">
						<span class="w-2 h-2 rounded-full flex-shrink-0" style="background: var(--color-cta)"></span>
						{errorMsg}
					</div>
				{/if}

				<form method="POST" use:enhance class="space-y-5">
					<div class="space-y-2">
						<Label for="phone" class="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">Nomor HP</Label>
						<Input
							type="tel"
							id="phone"
							name="phone"
							bind:value={$form.phone}
							placeholder="08123456789"
							inputmode="numeric"
							class="h-12 rounded-xl border-border bg-muted/30 focus-visible:ring-primary focus-visible:bg-transparent font-mono font-medium { $errors.phone ? 'border-destructive focus-visible:ring-destructive' : '' }"
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
							placeholder="••••••"
							class="h-12 rounded-xl border-border bg-muted/30 focus-visible:ring-primary focus-visible:bg-transparent font-medium { $errors.password ? 'border-destructive focus-visible:ring-destructive' : '' }"
						/>
						{#if $errors.password}
							<p class="text-xs text-destructive font-bold">{$errors.password}</p>
						{/if}
					</div>

					<Button
						type="submit"
						class="w-full h-12 mt-2 rounded-xl font-bold text-base transition-all duration-300 hover:-translate-y-0.5 shadow-lg"
						style="background: var(--color-cta); color: white;"
						disabled={loading}
					>
						{#if loading}
							<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
							Memasuki Toko...
						{:else}
							Masuk Sekarang →
						{/if}
					</Button>

					<div class="text-center text-sm font-medium text-ink-soft mt-6">
						Belum punya akun?
						<a href="/auth/register" class="font-bold hover:underline" style="color: var(--color-brand)">Daftar Gratis</a>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
