<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Store, User } from 'lucide-svelte';
	import { authState } from '$lib/stores/auth.svelte';
</script>

<Card.Root class="bg-paper shadow-sm border-border rounded-2xl overflow-hidden">
	<Card.Header class="bg-paper-alt border-b border-border/50 pb-4">
		<Card.Title class="flex items-center gap-2 font-grotesk text-ink text-xl">
			<Store class="w-5 h-5 text-brand" />
			Profil Toko
		</Card.Title>
		<Card.Description class="text-ink-soft text-sm"
			>Informasi akun dan akses Anda saat ini.</Card.Description
		>
	</Card.Header>
	<Card.Content class="pt-6">
		<div class="space-y-4">
			<div
				class="flex justify-between items-center border-b border-dashed border-border/60 pb-4"
			>
				<div class="flex items-center gap-4">
					<div class="bg-muted p-2.5 rounded-full border border-border/50">
						<Store class="w-5 h-5 text-ink-soft" />
					</div>
					<div>
						<p class="text-sm font-bold text-ink leading-none font-mono uppercase tracking-widest">
							ID Toko
						</p>
						<p class="text-[11px] text-ink-soft mt-1">Identitas unik usaha Anda</p>
					</div>
				</div>
				<span
					class="font-bold font-mono text-sm bg-muted/50 px-3 py-1 rounded-lg border border-border/50 text-ink"
					>{authState.user?.businessId || 'N/A'}</span
				>
			</div>
			<div class="flex justify-between items-center pb-2">
				<div class="flex items-center gap-4">
					<div class="bg-muted p-2.5 rounded-full border border-border/50">
						<User class="w-5 h-5 text-ink-soft" />
					</div>
					<div>
						<p class="text-sm font-bold text-ink leading-none font-mono uppercase tracking-widest">
							Peran Akses
						</p>
						<p class="text-[11px] text-ink-soft mt-1">Level hak akses sistem</p>
					</div>
				</div>
				<Badge
					variant="secondary"
					class="capitalize font-mono tracking-widest text-[10px] bg-brand/10 text-brand border-none shadow-none px-2"
					>{authState.user?.roleId || 'N/A'}</Badge
				>
			</div>
		</div>
	</Card.Content>
</Card.Root>
