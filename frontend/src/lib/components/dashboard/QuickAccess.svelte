<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { Store, ShoppingCart, Package, Users, LineChart, Handshake, Calculator, Sparkles } from 'lucide-svelte';
	import { fly } from 'svelte/transition';

	const quickMenus = [
		{ label: 'Kasir', href: '/pos', icon: ShoppingCart, color: 'text-cta', bg: 'bg-cta-soft' },
		{ label: 'Stok', href: '/products', icon: Package, color: 'text-brand', bg: 'bg-brand-soft' },
		{ label: 'Pelanggan', href: '/customers', icon: Users, color: 'text-success', bg: 'bg-success-soft' },
		{ label: 'Laporan', href: '/reports', icon: LineChart, color: 'text-info', bg: 'bg-info-soft' },
		{ label: 'Hutang', href: '/debts', icon: Handshake, color: 'text-warning', bg: 'bg-warning-soft' },
		{ label: 'AI Asisten', href: '/ai', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100' },
		{ label: 'Hitung', href: '/calculator', icon: Calculator, color: 'text-ink-soft', bg: 'bg-muted' }
	];
</script>

<div>
	<h2 class="font-grotesk font-bold text-base text-ink mb-4 flex items-center gap-2">
		<Store class="w-4 h-4 text-brand" /> Akses Cepat
	</h2>

	<div class="grid grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
		{#each quickMenus as menu, i}
			<a
				href={menu.href}
				class="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-paper-alt hover:bg-paper hover:border-brand/30 hover:shadow-md transition-all duration-200 min-h-[80px]"
				in:fly={{ y: 10, duration: 300, delay: 100 + i * 40 }}
			>
				<div
					class="w-10 h-10 rounded-lg {menu.bg} flex items-center justify-center group-hover:scale-110 transition-transform"
				>
					<menu.icon class="w-5 h-5 {menu.color}" />
				</div>
				<span class="font-semibold text-xs text-ink-soft group-hover:text-ink transition-colors">
					{menu.label}
				</span>
			</a>
		{/each}
	</div>

	<Separator class="my-4" />

	<div class="p-3 rounded-xl bg-brand-soft border border-brand/20">
		<p class="text-[10px] font-mono font-bold text-brand uppercase tracking-wider mb-1.5">
			Status Toko
		</p>
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
			<p class="text-xs font-semibold text-ink-soft">Online & Tersinkronisasi</p>
		</div>
	</div>
</div>
