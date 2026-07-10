<script lang="ts">
	import { apiClient, getApiUrl } from '$lib/utils/api';
	import { env } from '$env/dynamic/public';
	import { authState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Brain, TrendingUp, AlertTriangle, MessageSquare, Send, Sparkles } from '@lucide/svelte';
	import { formatRupiah } from '$lib/utils/format';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { slide } from 'svelte/transition';

	let loading = $state(true);
	let predictions = $state<any>(null);
	let summary = $state<string>('');

	// Chat state
	let chatInput = $state('');
	let chatMessages = $state<{role: 'user'|'assistant', content: string}[]>([
		{ role: 'assistant', content: 'Halo! Saya asisten AI UMKM Anda. Anda bisa bertanya tentang **stok**, **omzet**, atau **piutang**.' }
	]);
	let isTyping = $state(false);

	onMount(async () => {
		try {
			const [predRes, sumRes] = await Promise.all([
				apiClient(`/ai/predictions`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				}),
				apiClient(`/ai/summary`, {
					headers: { Authorization: `Bearer ${authState.token}` }
				})
			]);

			const predData = await predRes.json();
			const sumData = await sumRes.json();

			if (predData.success) predictions = predData.data;
			if (sumData.success) summary = sumData.data.summary;
		} catch (error) {
			console.error("Failed to fetch AI data", error);
		} finally {
			loading = false;
		}
	});

	async function sendMessage() {
		if (!chatInput.trim()) return;

		const userMsg = chatInput;
		chatMessages = [...chatMessages, { role: 'user', content: userMsg }];
		chatInput = '';
		isTyping = true;

		try {
			const data = await apiClient(`/ai/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authState.token}`
				},
				body: JSON.stringify({ message: userMsg })
			});
			if (data.success) {
				chatMessages = [...chatMessages, { role: 'assistant', content: data.data.response }];
			}
		} catch (error) {
			chatMessages = [...chatMessages, { role: 'assistant', content: 'Maaf, terjadi kesalahan saat menghubungi server.' }];
		} finally {
			isTyping = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') sendMessage();
	}
    
    // Markdown simple parser for chat
    function parseMarkdown(text: string) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    }
</script>

<div class="flex flex-col gap-6">
	<PageHeader title="Fitur AI (Beta)" subtitle="Analisis cerdas dan asisten otomatis untuk bisnis Anda" />

	{#if loading}
		<div class="flex justify-center py-12"><LoadingSpinner /></div>
	{:else}
		<!-- AI Summary Alert -->
		{#if summary}
			<div class="bg-gradient-to-r from-brand/10 to-purple-500/10 border border-brand/20 p-4 rounded-2xl flex gap-4 items-start" transition:slide>
				<div class="p-2 bg-brand/20 rounded-xl text-brand shrink-0">
					<Sparkles class="w-6 h-6" />
				</div>
				<div>
					<h3 class="font-bold text-ink mb-1 font-grotesk">Ringkasan Otomatis Minggu Ini</h3>
					<p class="text-sm text-ink-soft leading-relaxed">
						{@html parseMarkdown(summary)}
					</p>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Col 1: Predictions -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Sales Prediction -->
				<Card class="rounded-3xl border-border shadow-sm">
					<CardHeader>
						<CardTitle class="flex items-center gap-2 font-grotesk text-lg">
							<TrendingUp class="w-5 h-5 text-success" />
							Prediksi Penjualan (30 Hari Kedepan)
						</CardTitle>
						<CardDescription>Berdasarkan tren 14 hari terakhir</CardDescription>
					</CardHeader>
					<CardContent>
						{#if predictions?.salesProjection}
							{@const sp = predictions.salesProjection}
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div class="p-4 bg-paper-alt rounded-2xl border border-border text-center">
									<p class="text-xs font-bold text-ink-soft mb-1 uppercase tracking-wider font-mono">Lalu (7 Hr)</p>
									<p class="font-bold text-ink">{formatRupiah(sp.prev7Days)}</p>
								</div>
								<div class="p-4 bg-paper-alt rounded-2xl border border-border text-center">
									<p class="text-xs font-bold text-ink-soft mb-1 uppercase tracking-wider font-mono">Kini (7 Hr)</p>
									<p class="font-bold text-ink">{formatRupiah(sp.last7Days)}</p>
								</div>
								<div class="p-4 bg-{sp.growthRate > 0 ? 'success' : 'danger'}-soft rounded-2xl border border-border text-center">
									<p class="text-xs font-bold text-ink-soft mb-1 uppercase tracking-wider font-mono">Tren</p>
									<p class="font-bold text-{sp.growthRate > 0 ? 'success' : 'danger'}">
										{sp.growthRate > 0 ? '+' : ''}{sp.growthRate.toFixed(1)}%
									</p>
								</div>
								<div class="p-4 bg-brand-soft border border-brand/20 rounded-2xl text-center">
									<p class="text-xs font-bold text-brand mb-1 uppercase tracking-wider font-mono">Proyeksi 30 Hr</p>
									<p class="font-bold text-brand">{formatRupiah(sp.projectedNext30Days)}</p>
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Stock Out Prediction -->
				<Card class="rounded-3xl border-border shadow-sm">
					<CardHeader>
						<CardTitle class="flex items-center gap-2 font-grotesk text-lg">
							<AlertTriangle class="w-5 h-5 text-warning" />
							Peringatan Stok Menipis
						</CardTitle>
						<CardDescription>Estimasi stok habis berdasarkan kecepatan penjualan harian</CardDescription>
					</CardHeader>
					<CardContent>
						{#if predictions?.stockAlerts?.length > 0}
							<div class="space-y-3">
								{#each predictions.stockAlerts as alert}
									<div class="flex justify-between items-center p-3 border border-border rounded-xl bg-paper-alt">
										<div>
											<p class="font-bold text-sm text-ink">{alert.productName}</p>
											<p class="text-xs text-ink-soft mt-0.5">Terjual {alert.totalSold} dalam 30 hari ({(alert.dailyVelocity).toFixed(1)}/hari)</p>
										</div>
										<div class="text-right">
											<span class="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono {alert.status === 'critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'} mb-1">
												Habis dalam {Math.floor(alert.daysToEmpty)} hari
											</span>
											<p class="text-xs font-semibold text-ink-soft">Sisa Stok: {alert.currentStock}</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-6">
								<p class="text-ink-soft font-medium">Belum ada peringatan stok. Semua aman!</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- Col 2: Chat Assistant -->
			<Card class="rounded-3xl border-border shadow-sm flex flex-col h-[500px] lg:h-auto overflow-hidden">
				<CardHeader class="border-b border-border bg-paper pb-4">
					<CardTitle class="flex items-center gap-2 font-grotesk text-lg">
						<Brain class="w-5 h-5 text-brand" />
						Asisten Chat
					</CardTitle>
					<CardDescription>Tanya tentang stok, omzet, atau piutang</CardDescription>
				</CardHeader>
				
				<CardContent class="flex-1 p-0 flex flex-col min-h-0 bg-paper-alt">
					<ScrollArea class="flex-1 p-4">
						<div class="space-y-4">
							{#each chatMessages as msg}
								<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
									<div class="max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed 
										{msg.role === 'user' ? 'bg-brand text-white rounded-br-sm' : 'bg-white border border-border text-ink rounded-bl-sm shadow-sm'}">
										{@html parseMarkdown(msg.content)}
									</div>
								</div>
							{/each}
							{#if isTyping}
								<div class="flex justify-start">
									<div class="p-3 bg-white border border-border rounded-2xl rounded-bl-sm shadow-sm flex gap-1">
										<div class="w-2 h-2 rounded-full bg-brand/40 animate-bounce"></div>
										<div class="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style="animation-delay: 0.1s"></div>
										<div class="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style="animation-delay: 0.2s"></div>
									</div>
								</div>
							{/if}
						</div>
					</ScrollArea>
					
					<div class="p-3 bg-paper border-t border-border mt-auto">
						<div class="flex gap-2">
							<Input 
								bind:value={chatInput} 
								onkeydown={handleKeydown}
								placeholder="Ketik 'omzet hari ini'..."
								class="rounded-xl border-border focus-visible:ring-brand"
							/>
							<Button 
								size="icon" 
								onclick={sendMessage}
								disabled={!chatInput.trim() || isTyping}
								class="rounded-xl shrink-0"
							>
								<Send class="w-4 h-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
