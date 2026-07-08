<script lang="ts">
	import { env } from '$env/dynamic/public';
	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
	import { setAuth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let phone = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		errorMsg = '';

		try {
			const res = await fetch(`${API_URL}/v1/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone, password })
			});

			const result = await res.json();

			if (result.success) {
				setAuth(result.data.token, {
					userId: result.data.userId,
					businessId: result.data.businessId
				});
				goto('/');
			} else {
				errorMsg = result.error?.message || 'Login gagal';
			}
		} catch (err) {
			errorMsg = 'Koneksi ke server gagal';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-muted/40 p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl font-bold">Masuk ke Kasir</Card.Title>
			<Card.Description>Lanjutkan kelola usaha Anda</Card.Description>
		</Card.Header>

		<Card.Content>
			{#if errorMsg}
				<div class="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 border border-destructive/20">
					{errorMsg}
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-4">
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
						placeholder="••••••"
					/>
				</div>

				<Button type="submit" class="w-full mt-2" disabled={loading}>
					{loading ? 'Memproses...' : 'Masuk'}
				</Button>
			</form>
		</Card.Content>

		<Card.Footer class="flex justify-center border-t p-4">
			<div class="text-center text-sm text-muted-foreground">
				Belum punya akun? <a href="/auth/register" class="text-primary font-medium hover:underline">Daftar sekarang</a>
			</div>
		</Card.Footer>
	</Card.Root>
</div>
