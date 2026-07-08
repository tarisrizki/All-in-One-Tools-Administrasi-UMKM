<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ShieldCheck, ChevronRight } from 'lucide-svelte';
	import { hasPermission } from '$lib/stores/auth.svelte';
</script>

{#if hasPermission('roles.manage')}
	<Card.Root class="border-none shadow-sm bg-card/50 backdrop-blur-sm transition-all hover:bg-card hover:shadow-md group cursor-pointer" onclick={() => window.location.href = '/settings/roles'}>
		<Card.Content class="p-4 sm:p-6 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<div class="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
					<ShieldCheck class="w-5 h-5 sm:w-6 sm:h-6" />
				</div>
				<div>
					<h3 class="font-bold text-base sm:text-lg">Hak Akses (Roles)</h3>
					<p class="text-sm text-muted-foreground hidden sm:block">Kelola kewenangan untuk setiap jenis karyawan</p>
				</div>
			</div>
			
			<div class="text-muted-foreground group-hover:text-primary transition-colors">
				<ChevronRight class="w-5 h-5" />
			</div>
		</Card.Content>
	</Card.Root>
{/if}
