<script lang="ts">
	import { onMount } from 'svelte';

	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Check, ArrowRight, ChevronDown, ChevronUp, Menu, X,
		ShoppingCart, Warehouse, Wallet, Users, BarChart2, Printer, Plug,
		Archive, TrendingUp, Lightbulb, FileText, Bot,
		Package
	} from '@lucide/svelte';


	let navScrolled = $state(false);
	let mobileMenuOpen = $state(false);
	let backTopVisible = $state(false);
	let activeTab = $state('dashboard');
	let openFaq = $state<number | null>(null);

	// Profit calculator
	let calcModal = $state(15000);
	let calcJual = $state(20000);
	$effect(() => {
		// reactive calc
		calcModal; calcJual;
	});
	let profit = $derived(calcJual - calcModal);
	let margin = $derived(calcJual > 0 ? ((profit / calcJual) * 100).toFixed(1) : '0.0');
	let markup = $derived(calcModal > 0 ? ((profit / calcModal) * 100).toFixed(1) : '0.0');

	// Stat counters
	let stat1 = $state(0);
	let stat2 = $state(0);

	function fmtRp(n: number) {
		return 'Rp ' + Math.round(n).toLocaleString('id-ID');
	}

	function animateCount(to: number, setter: (v: number) => void, duration = 1400) {
		const start = performance.now();
		function tick(now: number) {
			const p = Math.min((now - start) / duration, 1);
			const e = 1 - Math.pow(1 - p, 3);
			setter(Math.round(to * e));
			if (p < 1) requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	const faqs = [
		{ q: 'Apakah aplikasi ini susah dipakai buat yang kurang paham teknologi?', a: 'Beres dirancang sesederhana mungkin, mirip seperti pakai aplikasi chat biasa. Tersedia juga video panduan dan tim support yang siap bantu langsung.' },
		{ q: 'Apakah data usaha saya aman?', a: 'Semua data tersimpan aman dengan enkripsi, dan otomatis di-backup setiap hari. Anda juga bisa export data kapan saja.' },
		{ q: 'Bisa dipakai di HP biasa atau harus komputer?', a: 'Bisa dipakai di HP Android, iPhone, tablet, maupun komputer atau laptop. Cukup pakai browser atau aplikasi, tanpa perlu perangkat khusus.' },
		{ q: 'Kalau toko saya belum punya printer struk, bisa pakai Beres?', a: 'Bisa. Struk juga bisa dikirim lewat WhatsApp atau email, jadi belum perlu beli printer di awal.' },
		{ q: 'Apakah bisa dicoba dulu sebelum berlangganan?', a: 'Bisa. Tersedia paket gratis selamanya, cocok untuk usaha yang baru mulai.' },
	];

	const features = [
		{ icon: ShoppingCart, color: '#2A2F78', tint: '#E7E8F6', title: 'Kasir & Transaksi', desc: 'Layani pembeli lebih cepat, semua transaksi tercatat otomatis.', items: ['Kasir digital (POS) yang mudah dipakai', 'Invoice, kwitansi & nota otomatis', 'Surat jalan untuk pengiriman barang', 'QRIS & semua metode pembayaran'] },
		{ icon: Warehouse, color: '#0E8F5E', tint: '#DEF4EA', title: 'Stok & Gudang', desc: 'Pantau barang masuk-keluar tanpa perlu hitung manual.', items: ['Data produk & kategori lengkap', 'Stok real-time, otomatis ter-update', 'Kelola banyak gudang sekaligus', 'Data supplier & PO dalam hitungan detik'] },
		{ icon: Wallet, color: '#C9891A', tint: '#FBF0DA', title: 'Keuangan & Laporan', desc: 'Tahu persis uang masuk, keluar, dan untung usaha Anda.', items: ['Buku kas digital, otomatis terekap', 'Catat pemasukan & pengeluaran harian', 'Kelola hutang & piutang pelanggan', 'Laporan laba rugi & arus kas otomatis', 'Kalkulator harga jual, margin, BEP & ROI'] },
		{ icon: Users, color: '#DD4B1E', tint: '#FBE7DD', title: 'Pelanggan & Karyawan', desc: 'Kenal pelanggan setia, kelola tim usaha dengan rapi.', items: ['Database pelanggan (CRM) lengkap', 'Membership & poin loyalty', 'Data & jadwal karyawan', 'Multi-user dengan hak akses berbeda'] },
		{ icon: BarChart2, color: '#2A2F78', tint: '#E7E8F6', title: 'Analitik & Laporan', desc: 'Lihat performa usaha dalam satu layar, kapan saja.', items: ['Dashboard bisnis real-time', 'Laporan penjualan & inventori lengkap', 'Export laporan ke PDF & Excel', 'Backup data otomatis, aman tersimpan'] },
		{ icon: Printer, color: '#0E8F5E', tint: '#DEF4EA', title: 'Cetak & Label', desc: 'Semua kebutuhan cetak, tanpa aplikasi tambahan.', items: ['Generator barcode & QR Code', 'Cetak label pengiriman', 'Stempel & tanda tangan digital', 'Kompatibel printer barcode & thermal'] },
	];

	const aiFeatures = [
		{ icon: Archive, title: 'Prediksi Stok Habis', desc: 'Beres kasih tahu produk apa yang bakal habis, sebelum benar-benar kehabisan.' },
		{ icon: TrendingUp, title: 'Prediksi Penjualan', desc: 'Perkiraan penjualan ke depan berdasarkan pola transaksi sebelumnya.' },
		{ icon: Lightbulb, title: 'Rekomendasi Restok', desc: 'Saran barang apa dan berapa banyak yang perlu dibeli kembali.' },
		{ icon: FileText, title: 'Ringkasan Performa', desc: 'Rangkuman harian & mingguan performa usaha, tanpa buka laporan manual.' },
		{ icon: Bot, title: 'Asisten Administrasi', desc: 'Tanya apa saja soal data toko Anda, dijawab langsung seperti chat.' },
	];


	const testimonials = [
		{ initials: 'SW', bg: '#2A2F78', name: 'Ibu Sri Wahyuni', biz: 'Warung Sembako, Solo', quote: '"Dulu tutup toko jam 9 malam cuma buat hitung uang kas. Sekarang tinggal lihat HP, langsung ketahuan untungnya."' },
		{ initials: 'PB', bg: '#0E8F5E', name: 'Pak Bambang', biz: 'Toko Bangunan, Bekasi', quote: '"Stok material paling sering bikin pusing. Sekarang ada notif kalau semen mau habis, jadi tidak pernah kehabisan lagi."' },
		{ initials: 'RA', bg: '#DD4B1E', name: 'Rina Amalia', biz: 'Online Shop Fashion, Bandung', quote: '"Pesanan dari Shopee, WA, sama Instagram sekarang tercatat di satu tempat. Tidak ada lagi orderan yang kelewat."' },
		{ initials: 'JS', bg: '#C9891A', name: 'Pak Joko Santoso', biz: 'Bengkel Motor, Surabaya', quote: '"Karyawan saya yang kurang paham teknologi pun bisa langsung pakai dalam sehari. Benar-benar gampang."' },
	];

	const bars = [42, 65, 50, 80, 60, 95, 70];

	onMount(() => {
		document.documentElement.classList.add('js-ready');

		// Scroll effects
		window.addEventListener('scroll', () => {
			const y = window.scrollY;
			navScrolled = y > 10;
			backTopVisible = y > 600;
		}, { passive: true });

		// Reveal observer
		const revealEls = document.querySelectorAll('.reveal');
		const revealObs = new IntersectionObserver((entries) => {
			entries.forEach(e => {
				if (e.isIntersecting) {
					(e.target as HTMLElement).classList.add('in-view');
					revealObs.unobserve(e.target);
				}
			});
		}, { threshold: 0.12 });
		revealEls.forEach(el => revealObs.observe(el));

		// Stats counter
		const statObs = new IntersectionObserver((entries) => {
			entries.forEach(e => {
				if (!e.isIntersecting) return;
				animateCount(15000, v => stat1 = v);
				animateCount(2000000, v => stat2 = v);
				statObs.disconnect();
			});
		}, { threshold: 0.4 });
		const statsSection = document.getElementById('stats-section');
		if (statsSection) statObs.observe(statsSection);

		return () => {
			revealObs.disconnect();
			statObs.disconnect();
		};
	});
</script>

<svelte:head>
	<title>Beres — Satu Aplikasi, Semua Urusan Toko Beres</title>
	<meta name="description" content="Beres adalah aplikasi kasir, stok, dan keuangan all-in-one untuk UMKM. Kasir, stok, gudang, keuangan, laporan, hingga asisten AI — semua dalam satu aplikasi yang mudah dipakai." />
</svelte:head>

<a href="#main-content" class="skip-link">Langsung ke konten utama</a>

<!-- ===== NAVBAR ===== -->
<header
	id="navbar"
	class="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
	class:bg-paper={navScrolled}
	class:backdrop-blur-md={navScrolled}
	class:border-b={navScrolled}
	class:border-border={navScrolled}
	class:shadow-sm={navScrolled}
	style="background: {navScrolled ? 'rgba(255,255,255,.92)' : 'transparent'}"
>
	<div class="container-base h-[76px] flex items-center justify-between">
		<a href="/" class="flex items-center gap-2.5 min-h-0 group">
			<div class="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold font-grotesk text-lg -rotate-6 shadow-sm group-hover:rotate-0 transition-transform flex-shrink-0">B</div>
			<span class="font-grotesk font-bold text-[22px] text-brand">Beres</span>
		</a>

		<!-- Desktop Nav -->
		<nav class="hidden md:flex items-center gap-9">
			{#each [['#fitur','Fitur'],['#cara-kerja','Cara Kerja'],['#kalkulator','Kalkulator'],['#harga','Harga'],['#faq','FAQ']] as [href, label]}
				<a {href} class="font-semibold text-[15px] text-ink-soft hover:text-brand transition-colors min-h-0">{label}</a>
			{/each}
		</nav>

		<div class="hidden md:flex items-center gap-3">
			<a href="/auth/login" class="font-bold text-[15px] text-ink hover:text-brand transition-colors min-h-0 px-2">Masuk</a>
			<Button href="/auth/register" class="bg-cta hover:bg-cta-dark text-white rounded-lg font-bold px-5 h-10">Coba Gratis</Button>
		</div>

		<!-- Mobile burger -->
		<button
			class="md:hidden flex flex-col gap-[5px] w-7 z-[110] min-h-0 min-w-0 p-1"
			onclick={() => mobileMenuOpen = !mobileMenuOpen}
			aria-label="Menu"
			aria-expanded={mobileMenuOpen}
		>
			{#each [0,1,2] as _}
				<span class="block h-[2.5px] w-full bg-ink rounded-sm transition-all duration-300"></span>
			{/each}
		</button>
	</div>

	<!-- Mobile menu -->
	{#if mobileMenuOpen}
		<div class="md:hidden fixed inset-0 bg-paper z-[100] flex flex-col items-center justify-center gap-7 text-[19px] font-semibold">
			<button class="absolute top-6 right-6 min-h-0 min-w-0" onclick={() => mobileMenuOpen = false} aria-label="Tutup menu">
				<X class="w-6 h-6 text-ink" />
			</button>
			{#each [['#fitur','Fitur'],['#cara-kerja','Cara Kerja'],['#kalkulator','Kalkulator'],['#harga','Harga'],['#faq','FAQ']] as [href, label]}
				<a {href} class="text-ink-soft hover:text-brand" onclick={() => mobileMenuOpen = false}>{label}</a>
			{/each}
			<Button href="/auth/register" class="bg-cta text-white font-bold px-8 h-12 rounded-xl mt-4" onclick={() => mobileMenuOpen = false}>Coba Gratis</Button>
		</div>
	{/if}
</header>

<main id="main-content">

<!-- ===== HERO ===== -->
<section class="pt-40 pb-24 overflow-hidden" style="background: var(--color-paper)">
	<div class="container-base">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
			<!-- Copy -->
			<div class="max-w-2xl">
				<span class="inline-flex items-center gap-2 bg-cta-soft text-cta font-mono font-semibold text-xs tracking-widest uppercase px-4 py-2 rounded-full mb-6">
					<Check class="w-4 h-4" /> Dipercaya 15.000+ Pelaku Usaha
				</span>
				<h1 class="font-grotesk font-bold text-5xl lg:text-6xl text-ink mb-6 leading-tight">
					Satu Aplikasi, Semua Urusan Toko Jadi <span class="text-cta">Beres</span>.
				</h1>
				<p class="text-lg lg:text-xl text-ink-soft mb-8 leading-relaxed">
					Kasir, stok, keuangan, sampai laporan usaha — semua otomatis jalan dalam satu aplikasi. Nggak perlu lagi catat manual atau gonta-ganti banyak aplikasi.
				</p>
				<div class="flex gap-4 flex-wrap mb-6">
					<Button href="/auth/register" class="bg-cta hover:bg-cta-dark text-white font-bold h-14 px-8 rounded-lg gap-2 text-base shadow-lg">
						Coba Gratis <ArrowRight class="w-5 h-5" />
					</Button>
					<Button href="#cara-kerja" variant="outline" class="h-14 px-8 rounded-lg font-bold text-base border-border text-ink hover:border-ink hover:bg-muted/50">
						Lihat Cara Kerja
					</Button>
				</div>
				<div class="flex flex-wrap gap-3 items-center font-mono text-sm text-ink-faint">
					{#each ['Tanpa kartu kredit','Setup 5 menit','100% Gratis'] as t, i}
						<span>{t}</span>
						{#if i < 2}<span class="text-border">•</span>{/if}
					{/each}
				</div>
			</div>

			<!-- Dashboard mockup -->
			<div class="relative min-h-[400px] hidden lg:block ml-auto w-full max-w-md">
				<!-- Decorative scraps -->
				<div aria-hidden="true">
					<div class="absolute -top-6 -left-8 w-32 bg-paper shadow-xl z-0 p-3 pb-6 -rotate-12 font-mono text-[10px] text-ink-faint"
						style="clip-path: polygon(0 0,100% 0,100% 91%,91% 100%,82% 91%,73% 100%,64% 91%,55% 100%,46% 91%,37% 100%,28% 91%,19% 100%,10% 91%,0 100%)">
						<div class="h-1 bg-border rounded w-4/5 mb-2"></div>
						<div class="h-1 bg-border rounded w-3/5 mb-2"></div>
						<div class="h-1 bg-border rounded w-4/5 mb-3"></div>
						<div class="font-bold text-ink text-xs border-t border-dashed border-border pt-2 mt-2">TOTAL Rp 45.000</div>
					</div>
					<div class="absolute top-4 -right-4 w-24 h-24 rounded-full bg-paper shadow-md flex items-center justify-center text-center font-mono font-bold text-xs text-cta tracking-wide rotate-12"
						style="border: 3px double var(--color-cta)">BERES</div>
					<div class="absolute -bottom-6 -left-4 w-32 p-3 rounded-md bg-warning shadow-lg text-xs font-bold text-warning-foreground rotate-6 z-0">Beli stok gula +20kg</div>
				</div>

				<!-- Dashboard mock card -->
				<div class="relative z-10 bg-paper border border-border rounded-3xl shadow-2xl p-6 rotate-2">

					<div class="flex items-center gap-2.5 mb-4">
						<div class="flex gap-1.5">
							{#each [1,2,3] as _}
								<span class="w-2 h-2 rounded-full bg-border"></span>
							{/each}
						</div>
						<span class="font-mono text-[12px] text-ink-faint font-medium">dashboard.beres.id</span>
					</div>
					<div class="grid grid-cols-2 gap-2.5 mb-5">
						<div class="bg-paper-alt rounded-lg p-3">
							<span class="block text-[11px] text-ink-soft mb-1">Penjualan Hari Ini</span>
							<span class="block font-mono font-bold text-base text-ink">Rp 1.245.000</span>
							<span class="text-[11px] font-bold text-success">↑ 12%</span>
						</div>
						<div class="bg-paper-alt rounded-lg p-3">
							<span class="block text-[11px] text-ink-soft mb-1">Transaksi</span>
							<span class="block font-mono font-bold text-base text-ink">48</span>
						</div>
						<div class="bg-warning-soft rounded-lg p-3">
							<span class="block text-[11px] text-ink-soft mb-1">Stok Menipis</span>
							<span class="block font-mono font-bold text-base text-warning">3 produk</span>
						</div>
						<div class="bg-success-soft rounded-lg p-3">
							<span class="block text-[11px] text-ink-soft mb-1">Untung Bersih</span>
							<span class="block font-mono font-bold text-base text-success">Rp 380.000</span>
						</div>
					</div>
					<!-- Mini chart -->
					<div class="flex items-end gap-2 h-[90px]" aria-hidden="true">
						{#each bars as h, i}
							<div
								class="flex-1 rounded-t-[5px] rounded-b-[2px] {i === bars.length - 1 ? 'bg-gradient-to-b from-cta to-cta-dark' : 'bg-gradient-to-b from-brand to-brand-dark'}"
								style="height: {h}%"
							></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== STATS BAR ===== -->
<section id="stats-section" class="py-11" style="background: var(--color-brand)">
	<div class="container-base">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
			<div class="text-center text-white">
				<span class="font-mono font-bold text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] block">{stat1.toLocaleString('id-ID')}+</span>
				<span class="text-[13px] text-white/70 mt-1 block">Pelaku Usaha Aktif</span>
			</div>
			<div class="text-center text-white">
				<span class="font-mono font-bold text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] block">{stat2 >= 1000000 ? '2jt+' : stat2.toLocaleString('id-ID') + '+'}</span>
				<span class="text-[13px] text-white/70 mt-1 block">Transaksi per Bulan</span>
			</div>
			<div class="text-center text-white">
				<div class="text-[#C9891A] text-[15px] mb-1">★★★★★</div>
				<span class="font-mono font-bold text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] block">4.9/5</span>
				<span class="text-[13px] text-white/70 mt-1 block">Rating Pengguna</span>
			</div>
			<div class="text-center text-white">
				<span class="font-mono font-bold text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] block">24/7</span>
				<span class="text-[13px] text-white/70 mt-1 block">Bantuan Siap Membantu</span>
			</div>
		</div>
	</div>
</section>

<!-- ===== FEATURES ===== -->
<section class="py-24" id="fitur" style="background: var(--color-paper-alt)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<span class="eyebrow mb-4">Semua Ada di Sini</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Satu Aplikasi untuk Semua Kebutuhan Usaha Anda</h2>
			<p class="text-ink-soft text-[1.08rem]">Dari transaksi harian sampai laporan keuangan bulanan, semua fitur yang usaha Anda butuhkan sudah tersedia dalam satu tempat.</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[22px] mb-[22px]">
			{#each features as f}
				<div
					class="bg-paper border border-border rounded-[14px] p-7 reveal hover:shadow-[0_10px_28px_rgba(20,22,45,.09)] transition-all duration-200 hover:-translate-y-1"
					style="border-left: 3px solid {f.color}"
				>
					<div class="w-12 h-12 rounded-lg flex items-center justify-center mb-5" style="background: {f.tint}; color: {f.color}">
						<f.icon class="w-5 h-5" />
					</div>
					<h3 class="font-grotesk font-bold text-[19px] text-ink mb-2">{f.title}</h3>
					<p class="text-ink-soft text-[14.5px] mb-4">{f.desc}</p>
					<ul class="space-y-1">
						{#each f.items as item}
							<li class="flex items-start gap-2.5 text-[14.5px] text-ink">
								<Check class="w-3.5 h-3.5 flex-shrink-0 mt-[3px]" style="color: {f.color}" />
								{item}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<!-- Integration card (wide) -->
		<div class="bg-paper border border-border rounded-[14px] p-7 reveal" style="border-left: 3px solid #C9891A">
			<div class="flex items-center gap-5 flex-wrap">
				<div class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style="background: #FBF0DA; color: #C9891A">
					<Plug class="w-5 h-5" />
				</div>
				<div class="flex-1 min-w-[240px]">
					<h3 class="font-grotesk font-bold text-[19px] text-ink mb-1">Integrasi & Konektivitas</h3>
					<p class="text-ink-soft text-[14.5px]">Terhubung dengan tools yang sudah biasa Anda pakai — marketplace, WhatsApp, Email, dan payment gateway, semua sinkron otomatis tanpa input dobel.</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== AI SECTION ===== -->
<section class="py-24 relative overflow-hidden" style="background: var(--color-paper-dark)">
	<div class="absolute -top-1/5 -right-1/10 w-[560px] h-[560px] rounded-full pointer-events-none"
		style="background: radial-gradient(circle, rgba(221,75,30,.25), transparent 70%)"></div>
	<div class="container-base relative z-10">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<span class="eyebrow mb-4" style="color: var(--color-cta)">Ditenagai AI</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-white mb-4">Asisten Bisnis Pintar yang Selalu Siap Membantu</h2>
			<p class="text-[#BFC2E0] text-[1.08rem]">Beres nggak cuma mencatat — Beres membantu Anda mengambil keputusan yang lebih baik untuk usaha, setiap hari.</p>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[18px]">
			{#each aiFeatures as af}
				<div class="rounded-[14px] p-6 reveal" style="background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1)">
					<div class="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center mb-4" style="background: rgba(221,75,30,.18); color: var(--color-cta)">
						<af.icon class="w-5 h-5" />
					</div>
					<h3 class="font-grotesk font-bold text-[15.5px] text-white mb-2">{af.title}</h3>
					<p class="text-[13.3px] text-[#BFC2E0]">{af.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ===== APP PREVIEW ===== -->
<section class="py-24" style="background: var(--color-paper)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-10 reveal">
			<span class="eyebrow mb-4">Tampilan Aplikasi</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Simpel Dipakai, Powerful Hasilnya</h2>
			<p class="text-ink-soft text-[1.08rem]">Tampilan yang bersih dan gampang dimengerti, bahkan untuk yang baru pertama kali pakai aplikasi kasir.</p>
		</div>

		<!-- Tab buttons -->
		<div class="flex justify-center gap-2.5 mb-9 flex-wrap reveal">
			{#each [['dashboard','Dashboard'],['kasir','Kasir'],['laporan','Laporan']] as [tab, label]}
				<button
					class="px-5 py-3 rounded-full border-[1.5px] font-bold text-[14.5px] transition-all duration-150 min-h-0"
					class:bg-brand={activeTab === tab}
					class:border-brand={activeTab === tab}
					class:text-white={activeTab === tab}
					class:border-border={activeTab !== tab}
					class:text-ink-soft={activeTab !== tab}
					onclick={() => activeTab = tab}
				>{label}</button>
			{/each}
		</div>

		<!-- Preview frame -->
		<div class="max-w-[780px] mx-auto bg-paper border border-border rounded-[22px] shadow-[0_24px_56px_rgba(20,22,45,.16)] p-7 reveal">
			<div class="flex items-center justify-between mb-5 pb-4 border-b border-border">
				<div class="flex gap-1.5">
					{#each [1,2,3] as _}<span class="w-[9px] h-[9px] rounded-full bg-border"></span>{/each}
				</div>
				<span class="font-mono text-[12.5px] text-ink-faint">app.beres.id</span>
				<div class="w-16"></div>
			</div>

			{#if activeTab === 'dashboard'}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
					{#each [['Penjualan','Rp 1.245.000'],['Transaksi','48'],['Produk Terjual','132'],['Untung Bersih','Rp 380rb']] as [l, v]}
						<div class="bg-paper-alt rounded-lg p-3.5">
							<span class="block text-[11px] text-ink-soft mb-1">{l}</span>
							<span class="block font-mono font-bold text-base text-ink">{v}</span>
						</div>
					{/each}
				</div>
				<div class="flex items-end gap-2.5 h-[120px] mb-4" aria-hidden="true">
					{#each [35,55,40,70,50,85,65,90,60] as h}
						<div class="flex-1 rounded-t-[6px] rounded-b-sm bg-gradient-to-b from-brand to-brand-dark" style="height: {h}%"></div>
					{/each}
				</div>
				<div class="border-t border-border pt-3.5 space-y-2.5">
					{#each [['Penjualan — Kopi Susu x2','Baru saja · QRIS','+Rp 36.000',true],['Pembelian Stok — Gula 20kg','10 menit lalu · Tunai','-Rp 280.000',false],['Penjualan — Nasi Goreng x5','32 menit lalu · Transfer','+Rp 125.000',true]] as [name, meta, amt, isIncome]}
						<div class="flex justify-between items-center text-[13.5px]">
							<div>
								<div class="font-semibold text-ink">{name}</div>
								<div class="text-[12px] text-ink-faint">{meta}</div>
							</div>
							<div class="font-mono font-bold" class:text-success={isIncome} class:text-cta={!isIncome}>{amt}</div>
						</div>
					{/each}
				</div>
			{:else if activeTab === 'kasir'}
				<div class="grid md:grid-cols-[1.4fr_1fr] gap-5">
					<div class="grid grid-cols-3 gap-2.5">
						{#each [['☕','Kopi Susu','Rp 18.000'],['🍳','Nasi Goreng','Rp 25.000'],['🍔','Burger','Rp 22.000'],['💧','Air Mineral','Rp 5.000'],['🍪','Snack','Rp 8.000'],['🍦','Es Krim','Rp 12.000']] as [icon, name, price]}
							<div class="bg-paper-alt rounded-lg p-3 text-center">
								<div class="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center mx-auto mb-2 text-sm">{icon}</div>
								<div class="text-[12px] font-bold text-ink mb-0.5">{name}</div>
								<div class="text-[11px] text-ink-soft font-mono">{price}</div>
							</div>
						{/each}
					</div>
					<div class="bg-paper-alt rounded-lg p-4">
						{#each [['Kopi Susu x2','Rp 36.000'],['Nasi Goreng x1','Rp 25.000'],['Air Mineral x2','Rp 10.000']] as [item, price]}
							<div class="flex justify-between text-[12.5px] py-1.5 border-b border-dashed border-border">{item}<span>{price}</span></div>
						{/each}
						<div class="flex justify-between font-bold py-3 font-mono">Total<span>Rp 71.000</span></div>
						<div class="flex gap-2 mb-3">
							{#each ['QRIS','Tunai','Debit'] as m}
								<span class="flex-1 text-center py-1.5 bg-paper border border-border rounded text-[10.5px] font-bold text-ink-soft">{m}</span>
							{/each}
						</div>
						<div class="w-full py-3 bg-cta text-white text-center rounded-lg font-bold text-[14px]">Bayar Sekarang</div>
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-3 gap-3 mb-5">
					<div class="p-3.5 rounded-lg bg-success-soft"><span class="block text-[11px] text-ink-soft mb-1">Total Pendapatan</span><span class="block font-mono font-bold text-[15px] text-success">Rp 38.400.000</span></div>
					<div class="p-3.5 rounded-lg bg-cta-soft"><span class="block text-[11px] text-ink-soft mb-1">Total Pengeluaran</span><span class="block font-mono font-bold text-[15px] text-cta">Rp 24.100.000</span></div>
					<div class="p-3.5 rounded-lg bg-brand-soft"><span class="block text-[11px] text-ink-soft mb-1">Laba Bersih</span><span class="block font-mono font-bold text-[15px] text-brand">Rp 14.300.000</span></div>
				</div>
				<div class="flex items-end gap-2.5 h-[110px] mb-2" aria-hidden="true">
					{#each [30,45,38,60,52,75,68,82,90,78,95,88] as h}
						<div class="flex-1 rounded-t-[6px] rounded-b-sm bg-gradient-to-b from-brand to-brand-dark" style="height: {h}%"></div>
					{/each}
				</div>
				<p class="text-center text-[12.5px] text-ink-faint font-mono">Laba rugi 12 bulan terakhir</p>
			{/if}
		</div>
	</div>
</section>

<!-- ===== CALCULATOR ===== -->
<section class="py-24" id="kalkulator" style="background: var(--color-paper-alt)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<span class="eyebrow mb-4">Coba Langsung</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Hitung Untung Jualan Anda, Sekarang Juga</h2>
			<p class="text-ink-soft text-[1.08rem]">Nggak perlu install dulu. Masukkan angka di bawah, hasilnya langsung muncul.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center reveal max-w-4xl mx-auto">
			<!-- Inputs -->
			<div class="space-y-6">
				<div>
					<label for="calcModal" class="block font-bold text-[14.5px] text-ink mb-2">Harga Modal (per item)</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-mono font-semibold">Rp</span>
						<input
							type="number"
							id="calcModal"
							bind:value={calcModal}
							min="0"
							inputmode="numeric"
							class="w-full pl-12 pr-4 py-4 border-[1.5px] border-border rounded-lg font-mono text-base font-semibold transition-colors focus:outline-none focus:border-brand"
						/>
					</div>
				</div>
				<div>
					<label for="calcJual" class="block font-bold text-[14.5px] text-ink mb-2">Harga Jual (per item)</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint font-mono font-semibold">Rp</span>
						<input
							type="number"
							id="calcJual"
							bind:value={calcJual}
							min="0"
							inputmode="numeric"
							class="w-full pl-12 pr-4 py-4 border-[1.5px] border-border rounded-lg font-mono text-base font-semibold transition-colors focus:outline-none focus:border-brand"
						/>
					</div>
				</div>
				<p class="text-[13px] text-ink-faint">Kalkulator ini juga tersedia lengkap di aplikasi, termasuk perhitungan BEP dan ROI usaha Anda.</p>
			</div>

			<!-- Receipt -->
			<div class="bg-paper border border-border rounded-[14px] shadow-[0_24px_56px_rgba(20,22,45,.16)] p-8 pb-12 font-mono -rotate-1"
				style="clip-path: polygon(0 0,100% 0,100% 94%,95% 100%,90% 94%,85% 100%,80% 94%,75% 100%,70% 94%,65% 100%,60% 94%,55% 100%,50% 94%,45% 100%,40% 94%,35% 100%,30% 94%,25% 100%,20% 94%,15% 100%,10% 94%,5% 100%,0 94%)">
				<h4 class="text-center text-[14px] uppercase tracking-[.06em] mb-1 text-ink font-bold">Struk Perhitungan</h4>
				<p class="text-center text-[11px] text-ink-faint mb-5">beres.id · kalkulator untung</p>
				{#each [['Harga Jual', fmtRp(calcJual)], ['Harga Modal', fmtRp(calcModal)], ['Margin', `${margin}%`], ['Markup', `${markup}%`]] as [label, val]}
					<div class="flex justify-between text-[13.5px] py-2.5 border-b border-dashed border-border">
						<span class="text-ink-soft">{label}</span><span class="font-bold text-ink">{val}</span>
					</div>
				{/each}
				<div class="flex justify-between font-bold py-3.5 border-t-2 border-ink mt-1.5 text-base">
					<span>Untung / Item</span>
					<span class={profit >= 0 ? 'text-success' : 'text-cta'}>{fmtRp(profit)}</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== HOW IT WORKS ===== -->
<section class="py-24" id="cara-kerja" style="background: var(--color-paper)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<span class="eyebrow mb-4">Mulai Dalam 3 Langkah</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Gampang Banget, Nggak Perlu Jago Teknologi</h2>
			<p class="text-ink-soft text-[1.08rem]">Prosesnya urut dan singkat — usaha Anda bisa mulai pakai Beres hari ini juga.</p>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			{#each [['01','Daftar Akun Gratis','Isi data singkat, langsung bisa dipakai. Tidak ribet, tidak perlu training khusus.'],['02','Setup Toko dalam 5 Menit','Masukkan data produk & harga. Bisa juga import langsung dari file Excel.'],['03','Transaksi & Pantau Usaha','Mulai jualan pakai kasir digital, semua laporan otomatis muncul di dashboard.']] as [num, title, desc], i}
				<div class="relative pl-2 reveal">
					<span class="font-mono text-[14px] font-bold text-cta mb-3.5 block">{num}</span>
					<h3 class="font-grotesk font-bold text-[19px] text-ink mb-2.5">{title}</h3>
					<p class="text-ink-soft text-[14.5px]">{desc}</p>
					{#if i < 2}
						<div class="hidden md:block absolute top-2.5 -right-4 w-8 h-px bg-border"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ===== TESTIMONIALS ===== -->
<section class="py-24" style="background: var(--color-paper-alt)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<span class="eyebrow mb-4">Kata Pengguna</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Dipercaya Berbagai Jenis Usaha di Indonesia</h2>
			<p class="text-ink-soft text-[1.08rem]">Dari warung, toko bangunan, sampai online shop — semua urusan jadi lebih beres.</p>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
			{#each testimonials as t}
				<div class="bg-paper border border-border rounded-[14px] p-6 reveal hover:shadow-md transition-shadow">
					<div class="text-[#C9891A] text-[13px] mb-3.5">★★★★★</div>
					<p class="text-[14.5px] text-ink mb-5 italic leading-relaxed">{t.quote}</p>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white font-grotesk text-[15px] flex-shrink-0" style="background: {t.bg}">{t.initials}</div>
						<div>
							<div class="font-bold text-[13.5px] text-ink">{t.name}</div>
							<div class="text-[12px] text-ink-soft">{t.biz}</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ===== PRICING ===== -->
<section class="py-24" id="harga" style="background: var(--color-paper)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<span class="eyebrow mb-4">Investasi Usaha</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Pilih Paket Sesuai Kebutuhan Usaha Anda</h2>
			<p class="text-ink-soft text-[1.08rem]">Semua paket bisa dicoba tanpa risiko. Naik paket kapan saja seiring usaha berkembang.</p>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-7 items-start max-w-4xl mx-auto">
			<!-- Free -->
			<div class="bg-paper border-[1.5px] border-border rounded-[22px] p-8 pb-12 reveal"
				style="clip-path: polygon(0 0,100% 0,100% 97%,94% 100%,88% 97%,82% 100%,76% 97%,70% 100%,64% 97%,58% 100%,52% 97%,46% 100%,40% 97%,34% 100%,28% 97%,22% 100%,16% 97%,10% 100%,4% 97%,0 100%)">
				<div class="font-grotesk font-bold text-[20px] text-ink mb-1.5">Gratis</div>
				<div class="text-[13.5px] text-ink-soft mb-5">Buat yang baru mulai usaha</div>
				<div class="font-mono font-bold text-[2.2rem] text-ink mb-1">Rp 0</div>
				<div class="text-[13px] text-ink-soft mb-6">selamanya</div>
				<ul class="space-y-1.5 mb-7">
					{#each ['Kasir dasar untuk 1 toko','Sampai 50 produk','1 pengguna','Laporan penjualan harian'] as item}
						<li class="flex items-start gap-2.5 text-[14px] text-ink"><Check class="w-3 h-3 text-success flex-shrink-0 mt-0.5" />{item}</li>
					{/each}
				</ul>
				<Button href="/auth/register" variant="outline" class="w-full h-12 font-bold rounded-lg border-border">Mulai Gratis</Button>
			</div>

			<!-- Pro (featured) -->
			<div class="relative border-[1.5px] border-brand rounded-[22px] p-8 pb-12 shadow-[0_24px_56px_rgba(20,22,45,.16)] scale-[1.04] reveal"
				style="background: var(--color-brand); color: white; clip-path: polygon(0 0,100% 0,100% 97%,94% 100%,88% 97%,82% 100%,76% 97%,70% 100%,64% 97%,58% 100%,52% 97%,46% 100%,40% 97%,34% 100%,28% 97%,22% 100%,16% 97%,10% 100%,4% 97%,0 100%)">
				<div class="absolute -top-4 right-6 bg-cta text-white font-mono text-[11px] font-bold px-3.5 py-1.5 rounded-full rotate-[6deg] shadow-sm uppercase tracking-wider">Paling Populer</div>
				<div class="font-grotesk font-bold text-[20px] mb-1.5">Pro</div>
				<div class="text-[13.5px] mb-5" style="color: rgba(255,255,255,.75)">Buat usaha yang mau berkembang</div>
				<div class="font-mono font-bold text-[2.2rem] mb-1">Rp 99rb</div>
				<div class="text-[13px] mb-6" style="color: rgba(255,255,255,.75)">per bulan</div>
				<ul class="space-y-1.5 mb-7">
					{#each ['Semua fitur paket Gratis','Produk & transaksi tanpa batas','Sampai 5 pengguna','Semua laporan keuangan','Integrasi WhatsApp & QRIS','Cetak barcode & label'] as item}
						<li class="flex items-start gap-2.5 text-[14px]"><Check class="w-3 h-3 flex-shrink-0 mt-0.5" style="color: #C9891A" />{item}</li>
					{/each}
				</ul>
				<Button href="/auth/register" class="w-full h-12 font-bold rounded-lg bg-white text-brand hover:bg-white/90">Coba Gratis 14 Hari</Button>
			</div>

			<!-- Business -->
			<div class="bg-paper border-[1.5px] border-border rounded-[22px] p-8 pb-12 reveal"
				style="clip-path: polygon(0 0,100% 0,100% 97%,94% 100%,88% 97%,82% 100%,76% 97%,70% 100%,64% 97%,58% 100%,52% 97%,46% 100%,40% 97%,34% 100%,28% 97%,22% 100%,16% 97%,10% 100%,4% 97%,0 100%)">
				<div class="font-grotesk font-bold text-[20px] text-ink mb-1.5">Bisnis</div>
				<div class="text-[13.5px] text-ink-soft mb-5">Buat usaha dengan banyak cabang</div>
				<div class="font-mono font-bold text-[2.2rem] text-ink mb-1">Rp 249rb</div>
				<div class="text-[13px] text-ink-soft mb-6">per bulan</div>
				<ul class="space-y-1.5 mb-7">
					{#each ['Semua fitur paket Pro','Multi-cabang & multi-gudang','Pengguna tanpa batas','Asisten AI lengkap','Integrasi marketplace','Dukungan prioritas'] as item}
						<li class="flex items-start gap-2.5 text-[14px] text-ink"><Check class="w-3 h-3 text-success flex-shrink-0 mt-0.5" />{item}</li>
					{/each}
				</ul>
				<Button variant="outline" class="w-full h-12 font-bold rounded-lg border-border">Hubungi Kami</Button>
			</div>
		</div>
	</div>
</section>

<!-- ===== FAQ ===== -->
<section class="py-24" id="faq" style="background: var(--color-paper-alt)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<span class="eyebrow mb-4">Pertanyaan Umum</span>
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink">Masih Ada yang Ingin Ditanyakan?</h2>
		</div>
		<div class="max-w-[780px] mx-auto reveal">
			{#each faqs as faq, i}
				<div class="border-b border-border">
					<button
						class="w-full flex justify-between items-center gap-5 py-5 px-1 text-left font-bold text-[16.5px] text-ink min-h-0"
						onclick={() => openFaq = openFaq === i ? null : i}
						aria-expanded={openFaq === i}
					>
						<span>{faq.q}</span>
						{#if openFaq === i}
							<ChevronUp class="w-5 h-5 text-cta flex-shrink-0" />
						{:else}
							<ChevronDown class="w-5 h-5 text-cta flex-shrink-0" />
						{/if}
					</button>
					{#if openFaq === i}
						<div class="pb-5 px-1">
							<p class="text-ink-soft text-[14.5px] max-w-[640px] leading-relaxed">{faq.a}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ===== FINAL CTA ===== -->
<section class="py-[90px] text-center" style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))">
	<div class="container-base">
		<h2 class="font-grotesk font-bold text-[clamp(1.8rem,1.4rem+1.6vw,2.6rem)] text-white mb-4 reveal">Saatnya Bisnis Anda Naik Level</h2>
		<p class="text-white/80 text-[1.1rem] max-w-[520px] mx-auto mb-9 reveal">Gabung dengan ribuan pelaku usaha yang sudah bikin urusan toko mereka lebih beres.</p>
		<div class="flex gap-4 justify-center flex-wrap reveal">
			<Button href="/auth/register" class="bg-white text-brand hover:bg-white/90 font-bold h-14 px-8 rounded-lg text-[15.5px]">Coba Gratis Sekarang</Button>
			<Button href="/auth/login" variant="outline" class="h-14 px-8 rounded-lg font-bold text-[15.5px] text-white hover:text-white hover:bg-white/10" style="border-color: rgba(255,255,255,.35)">
				Masuk ke Akun
			</Button>
		</div>
	</div>
</section>

</main>

<!-- ===== FOOTER ===== -->
<footer class="pt-[72px] pb-7" style="background: var(--color-ink); color: #C7C9DA">
	<div class="container-base">
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 mb-14">
			<div>
				<a href="/" class="flex items-center gap-2 mb-4 min-h-0 group">
					<div class="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold font-grotesk text-lg -rotate-6 group-hover:rotate-0 transition-transform">B</div>
					<span class="font-grotesk font-bold text-[22px] text-white">Beres</span>
				</a>
				<p class="text-[14px] text-[#9498B0] mb-5 max-w-[280px] leading-relaxed">Beres membantu pelaku UMKM mengelola seluruh kebutuhan bisnis dalam satu aplikasi yang mudah dipakai, dari kasir sampai laporan keuangan.</p>
			</div>
			{#each [['Produk',['Kasir & POS','Stok & Gudang','Keuangan','Asisten AI']],['Perusahaan',['Tentang Kami','Blog','Karier','Hubungi Kami']],['Bantuan',['FAQ','Pusat Bantuan','Tutorial','Status Sistem']]] as [title, links]}
				<div>
					<h4 class="font-sans text-[13.5px] uppercase tracking-[.06em] text-white mb-4 font-bold">{title}</h4>
					<ul class="space-y-3">
						{#each links as link}
							<li><a href="/" class="text-[14.5px] hover:text-white transition-colors">{link}</a></li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
		<div class="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-mono text-white/50">
			<span>© {new Date().getFullYear()} Beres. Semua hak cipta dilindungi.</span>
			<span><a href="/" class="hover:text-white transition-colors">Syarat & Ketentuan</a> · <a href="/" class="hover:text-white transition-colors">Kebijakan Privasi</a></span>
		</div>
	</div>
</footer>

<!-- Back to Top -->
<button
	class="fixed right-5 bottom-5 w-12 h-12 rounded-full text-white flex items-center justify-center shadow-md transition-all duration-300 z-50 min-h-0 min-w-0"
	style="background: var(--color-brand)"
	class:opacity-0={!backTopVisible}
	class:pointer-events-none={!backTopVisible}
	class:opacity-100={backTopVisible}
	onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
	aria-label="Kembali ke atas"
>
	↑
</button>

<style>
	/* Landing page local scoped styles */
	a:not(.skip-link) {
		min-height: unset;
	}

	section {
		position: relative;
	}
</style>
