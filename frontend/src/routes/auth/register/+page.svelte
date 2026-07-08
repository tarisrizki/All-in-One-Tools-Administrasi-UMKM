<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { setAuth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let step = $state(1);

	// Step 1: Account
	let phone = $state('');
	let password = $state('');

	// Step 2: Store
	let businessName = $state('');

	let loading = $state(false);
	let errorMsg = $state('');

	function nextStep(e: Event) {
		e.preventDefault();
		if (phone.length >= 10 && password.length >= 6) {
			step = 2;
			errorMsg = '';
		} else {
			errorMsg = 'Nomor HP minimal 10 angka, Kata sandi minimal 6 karakter';
		}
	}

	async function handleRegister(e: Event) {
		e.preventDefault();
		loading = true;
		errorMsg = '';

		try {
			const res = await fetch(`${API_URL}/v1/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone, password, businessName })
			});

			const result = await res.json();

			if (result.success) {
				setAuth(result.data.token, {
					userId: result.data.userId,
					businessId: result.data.businessId
				});
				goto('/');
			} else {
				errorMsg = result.error?.message || 'Gagal mendaftar';
			}
		} catch (err) {
			errorMsg = 'Koneksi ke server gagal';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-muted/40 p-4">
	<Card.Root class="w-full max-w-sm relative overflow-hidden">
		<Card.Header>
			<div class="flex justify-between items-center mb-2">
				{#if step === 2}
					<Button variant="ghost" size="sm" onclick={() => (step = 1)} class="text-muted-foreground -ml-3 h-8">
						← Kembali
					</Button>
				{:else}
					<div></div>
				{/if}
				<span class="text-xs font-mono text-muted-foreground">{step} / 2</span>
			</div>
			
			{#if step === 1}
				<Card.Title class="text-2xl font-bold">Daftar Akun</Card.Title>
				<Card.Description>Mulai kelola usaha Anda dengan mudah</Card.Description>
			{:else}
				<Card.Title class="text-2xl font-bold">Detail Toko</Card.Title>
				<Card.Description>Ceritakan tentang usahamu (untuk nota)</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content>
			{#if errorMsg}
				<div class="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 border border-destructive/20">
					{errorMsg}
				</div>
			{/if}

			{#if step === 1}
				<form onsubmit={nextStep} class="space-y-4">
					<div class="space-y-2">
						<Label for="phone">Nomor HP</Label>
						<Input
							type="tel"
							id="phone"
							bind:value={phone}
							required
							placeholder="08123456789"
						/>
					</div>
					<div class="space-y-2">
						<Label for="password">Kata Sandi</Label>
						<Input
							type="password"
							id="password"
							bind:value={password}
							required
							placeholder="Min. 6 karakter"
						/>
					</div>

					<Button type="submit" class="w-full mt-2">
						Lanjut Setup Toko
					</Button>
				</form>
			{:else if step === 2}
				<form onsubmit={handleRegister} class="space-y-4">
					<div class="space-y-2">
						<Label for="businessName">Nama Toko/Usaha</Label>
						<Input
							type="text"
							id="businessName"
							bind:value={businessName}
							required
							placeholder="Toko Berkah"
						/>
					</div>

					<Button type="submit" disabled={loading} class="w-full mt-2">
						{loading ? 'Menyimpan...' : 'Selesai & Buka Kasir'}
					</Button>
				</form>
			{/if}
		</Card.Content>

		{#if step === 1}
			<Card.Footer class="flex justify-center border-t p-4">
				<div class="text-center text-sm text-muted-foreground">
					Sudah punya akun? <a href="/auth/login" class="text-primary font-medium hover:underline">Masuk</a>
				</div>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>
