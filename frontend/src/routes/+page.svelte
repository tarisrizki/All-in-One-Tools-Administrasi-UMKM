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

	onMount(() => {
		document.documentElement.classList.add('js-ready');

		// Ukur tinggi stats agar navbar + hero + stats pas mengisi satu viewport
		const statsEl = document.getElementById('stats-section');
		if (statsEl) {
			document.documentElement.style.setProperty('--stats-h', statsEl.offsetHeight + 'px');
		}

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
	<title>Beres: Satu Aplikasi, Semua Urusan Toko Beres</title>
	<meta name="description" content="Beres adalah aplikasi kasir, stok, dan keuangan all-in-one untuk UMKM. Kasir, stok, gudang, keuangan, laporan, hingga asisten AI, semua dalam satu aplikasi yang mudah dipakai." />
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
	<div class="container-base h-16 flex items-center justify-between">
		<a href="/" class="flex items-center gap-2.5 min-h-0 group">
			<div class="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-lg -rotate-6 shadow-sm group-hover:rotate-0 transition-transform flex-shrink-0">B</div>
			<span class="font-bold text-[22px] text-brand">Beres</span>
		</a>

		<!-- Desktop Nav -->
		<nav class="hidden md:flex items-center gap-8">
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
<section class="pt-24 pb-10 overflow-hidden flex items-center" style="background: var(--color-paper); min-height: calc(100vh - 4rem - var(--stats-h, 8.75rem))">
	<div class="container-base w-full">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center">
			<!-- Copy -->
			<div class="max-w-[620px]">
				<h1 class="font-grotesk font-bold text-[2.75rem] lg:text-[3.5rem] text-ink mb-6 leading-[1.08]">
					Semua Urusan Toko Jadi <span class="text-cta">Beres</span>.
				</h1>
				<p class="text-lg lg:text-xl text-ink-soft mb-8 leading-relaxed max-w-lg">
					Kasir, stok, keuangan, dan laporan. Semua otomatis dalam satu aplikasi.
				</p>
				<div class="flex gap-4 flex-wrap">
					<Button href="/auth/register" class="bg-cta hover:bg-cta-dark text-white font-bold h-12 px-7 rounded-lg gap-2 text-base shadow-lg">
						Coba Gratis <ArrowRight class="w-5 h-5" />
					</Button>
					<Button href="#cara-kerja" variant="outline" class="h-12 px-7 rounded-lg font-bold text-base border-border text-ink hover:border-ink hover:bg-muted/50">
						Lihat Cara Kerja
					</Button>
				</div>
			</div>

			<!-- Struk + kartu komposisi (artifact fisik, bukan screenshot) -->
			<div class="relative min-h-[340px] lg:min-h-[360px] mt-12 lg:mt-0 ml-auto w-full max-w-md" aria-hidden="true">
				<div class="absolute -top-7 -left-14 w-40 p-4 rounded-lg bg-warning-soft text-ink font-bold text-[13px] -rotate-6 shadow-lg z-20">
					Stok menipis: Gula 20kg
					<div class="h-1.5 bg-warning/20 rounded-full mt-2 overflow-hidden"><div class="h-full w-2/3 bg-warning rounded-full"></div></div>
				</div>
				<div class="absolute -top-3 -right-3 w-44 p-4 rounded-lg bg-paper border border-border shadow-lg text-[12px] rotate-2 z-0">
					<div class="flex justify-between font-mono font-bold text-ink mb-1"><span>Penjualan hari ini</span><span class="text-success">↑ 12%</span></div>
					<div class="font-mono font-bold text-[15px] text-ink">Rp 1.245.000</div>
					<div class="flex justify-between text-ink-soft mt-2"><span>Transaksi</span><span class="font-mono font-bold text-ink">48</span></div>
				</div>

				<!-- Struk kasir fisik -->
				<div class="relative z-10 bg-paper border border-border rounded-lg shadow-xl p-6 pb-8 font-mono -rotate-1"
					style="clip-path: polygon(0 0,100% 0,100% 93%,94% 100%,88% 93%,82% 100%,76% 93%,70% 100%,64% 93%,58% 100%,52% 93%,46% 100%,40% 93%,34% 100%,28% 93%,22% 100%,16% 93%,10% 100%,4% 93%,0 100%)">
					<div class="text-center mb-4">
						<div class="font-bold text-[15px] text-ink tracking-wide">BERES KASIR</div>
						<div class="text-[11px] text-ink-soft mt-0.5">Jl. Merdeka No. 12 · 09 Agu 2026 14:32</div>
					</div>
					{#each [['Kopi Susu x2','36.000'],['Nasi Goreng x1','25.000'],['Air Mineral x2','10.000']] as [item, price]}
						<div class="flex justify-between text-[13px] py-2 border-b border-dashed border-border">{item}<span class="font-bold text-ink">{price}</span></div>
					{/each}
					<div class="flex justify-between font-bold py-4 text-[14px]">TOTAL<span>Rp 71.000</span></div>
					<div class="flex justify-between text-[11px] text-ink-soft">
						<span>QRIS</span><span class="font-mono">REF-20260809-0031</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== STATS BAR ===== -->
<section id="stats-section" class="py-8" style="background: var(--color-brand)">
	<div class="container-base">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
			<div class="text-center text-white min-w-0">
				<div class="h-12 flex items-center justify-center">
					<span class="font-mono font-bold text-[clamp(1.4rem,1.1rem+0.9vw,1.9rem)] whitespace-nowrap">{stat1.toLocaleString('id-ID')}+</span>
				</div>
				<span class="text-[13px] text-white/85 mt-1.5 block whitespace-nowrap">Pelaku Usaha Aktif</span>
			</div>
			<div class="text-center text-white min-w-0">
				<div class="h-12 flex items-center justify-center">
					<span class="font-mono font-bold text-[clamp(1.4rem,1.1rem+0.9vw,1.9rem)] whitespace-nowrap">{stat2 >= 1000000 ? '2jt+' : stat2.toLocaleString('id-ID') + '+'}</span>
				</div>
				<span class="text-[13px] text-white/85 mt-1.5 block whitespace-nowrap">Transaksi per Bulan</span>
			</div>
			<div class="text-center text-white min-w-0">
				<div class="h-12 flex items-center justify-center">
					<span class="text-[#C9891A] text-[15px] leading-none whitespace-nowrap">★★★★★</span>
				</div>
				<span class="text-[13px] text-white/85 mt-1.5 block whitespace-nowrap">Rating Pengguna</span>
			</div>
			<div class="text-center text-white min-w-0">
				<div class="h-12 flex items-center justify-center">
					<span class="font-mono font-bold text-[clamp(1.4rem,1.1rem+0.9vw,1.9rem)] whitespace-nowrap">24/7</span>
				</div>
				<span class="text-[13px] text-white/85 mt-1.5 block whitespace-nowrap">Bantuan Siap Membantu</span>
			</div>
		</div>
	</div>
</section>

<!-- ===== FEATURES ===== -->
<section class="pt-12 pb-24" id="fitur" style="background: var(--color-paper-alt)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Satu Aplikasi untuk Semua Kebutuhan Usaha Anda</h2>
			<p class="text-ink-soft text-[1.08rem]">Dari transaksi harian sampai laporan keuangan bulanan, semua fitur yang usaha Anda butuhkan sudah tersedia dalam satu tempat.</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-[22px]">
			{#each features as f, i}
				<div
					class="bg-paper border border-border rounded-[14px] p-7 reveal hover:border-ink/15 transition-colors duration-200 {i === 0 ? 'lg:col-span-4' : i === 5 ? 'lg:col-span-6' : 'lg:col-span-2'}"
				>
					<div class="flex items-center gap-3.5 mb-5">
						<div class="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style="background: {f.tint}; color: {f.color}">
							<f.icon class="w-5 h-5" />
						</div>
						<h3 class="font-sans font-bold text-[19px] text-ink">{f.title}</h3>
					</div>
					<p class="text-ink-soft text-[14.5px] mb-4">{f.desc}</p>
					<ul class="space-y-1 {i === 0 || i === 5 ? 'sm:grid sm:grid-cols-2 sm:gap-x-8' : ''}">
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
		<div class="bg-paper border border-border rounded-[14px] p-7 reveal hover:border-ink/15 transition-colors">
			<div class="flex items-center gap-5 flex-wrap">
				<div class="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style="background: #FBF0DA; color: #C9891A">
					<Plug class="w-5 h-5" />
				</div>
				<div class="flex-1 min-w-[240px]">
					<h3 class="font-sans font-bold text-[19px] text-ink mb-1">Integrasi & Konektivitas</h3>
					<p class="text-ink-soft text-[14.5px]">Terhubung dengan tools yang sudah biasa Anda pakai, seperti marketplace, WhatsApp, Email, dan payment gateway. Semua sinkron otomatis tanpa input dobel.</p>
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
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-white mb-4">Asisten Bisnis Pintar yang Selalu Siap Membantu</h2>
			<p class="text-[#D2D5E8] text-[1.08rem]">Beres nggak cuma mencatat. Beres membantu Anda mengambil keputusan yang lebih baik untuk usaha, setiap hari.</p>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[18px]">
			{#each aiFeatures as af}
				<div class="rounded-[14px] p-6 reveal" style="background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12)">
					<div class="flex items-center gap-2.5 mb-3">
						<div class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style="background: rgba(221,75,30,.18); color: var(--color-cta)">
							<af.icon class="w-4.5 h-4.5" />
						</div>
						<h3 class="font-sans font-bold text-[15.5px] text-white">{af.title}</h3>
					</div>
					<p class="text-[14px] text-[#D2D5E8] leading-relaxed">{af.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ===== UNTUK SIAPA ===== -->
<section class="py-24" style="background: var(--color-paper)">
	<div class="container-base">
		<div class="max-w-[680px] mb-14 reveal">
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Dibuat untuk Usaha yang Setiap Hari Melayani</h2>
			<p class="text-ink-soft text-[1.08rem]">Beres tidak butuh komputer khusus atau skill teknis. Cukup HP yang Anda pegang sekarang.</p>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
			{#each [
				['Warung & Toko Kelontong','Transaksi harian tercatat rapi, stok tidak pernah kehabisan tanpa disadari.'],
				['Kafe & Rumah Makan','Kasir cepat saat jam ramai, laporan omzet harian langsung terlihat.'],
				['Toko Online & Reseller','Pesanan dari Shopee, WA, dan Instagram terkumpul di satu tempat.']
			] as [title, desc]}
				<div class="border border-border rounded-[14px] p-7 bg-paper-alt/60 reveal hover:bg-paper transition-colors">
					<h3 class="font-sans font-bold text-[18px] text-ink mb-2">{title}</h3>
					<p class="text-ink-soft text-[14.5px]">{desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ===== CALCULATOR ===== -->
<section class="py-24" id="kalkulator" style="background: var(--color-paper-alt)">
	<div class="container-base">
		<div class="max-w-[680px] mx-auto text-center mb-14 reveal">
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
				<h3 class="text-center text-[14px] uppercase tracking-[.06em] mb-1 text-ink font-bold">Struk Perhitungan</h3>
				<p class="text-center text-[12px] text-ink-faint mb-5">beres.id · kalkulator untung</p>
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
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Gampang Banget, Nggak Perlu Jago Teknologi</h2>
			<p class="text-ink-soft text-[1.08rem]">Prosesnya urut dan singkat. Usaha Anda bisa mulai pakai Beres hari ini juga.</p>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			{#each [['Daftar Akun Gratis','Isi data singkat, langsung bisa dipakai. Tidak ribet, tidak perlu training khusus.'],['Setup Toko dalam 5 Menit','Masukkan data produk & harga. Bisa juga import langsung dari file Excel.'],['Transaksi & Pantau Usaha','Mulai jualan pakai kasir digital, semua laporan otomatis muncul di dashboard.']] as [title, desc], i}
				<div class="relative pl-2 reveal">
					<h3 class="font-sans font-bold text-[19px] text-ink mb-2.5">{title}</h3>
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
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Dipercaya Berbagai Jenis Usaha di Indonesia</h2>
			<p class="text-ink-soft text-[1.08rem]">Dari warung, toko bangunan, sampai online shop, semua urusan jadi lebih beres.</p>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
			{#each testimonials as t}
				<div class="bg-paper border border-border rounded-[14px] p-6 reveal hover:shadow-md transition-shadow">
					<div class="text-[#C9891A] text-[13px] mb-3.5">★★★★★</div>
					<p class="text-[15px] text-ink mb-5 italic leading-relaxed">{t.quote}</p>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-[15px] flex-shrink-0" style="background: {t.bg}">{t.initials}</div>
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
			<h2 class="font-grotesk font-bold text-[clamp(1.75rem,1.3rem+2vw,2.65rem)] text-ink mb-4">Pilih Paket Sesuai Kebutuhan Usaha Anda</h2>
			<p class="text-ink-soft text-[1.08rem]">Semua paket bisa dicoba tanpa risiko. Naik paket kapan saja seiring usaha berkembang.</p>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-7 items-stretch max-w-4xl mx-auto">
			<!-- Free -->
			<div class="flex flex-col bg-paper border-[1.5px] border-border rounded-[22px] p-7 reveal hover:border-ink/20 transition-colors">
				<div class="font-bold text-[20px] text-ink mb-1.5">Gratis</div>
				<div class="text-[13.5px] text-ink-soft mb-5">Buat yang baru mulai usaha</div>
				<div class="font-mono font-bold text-[2.2rem] text-ink mb-1">Rp 0</div>
				<div class="text-[13px] text-ink-soft mb-6">selamanya</div>
				<ul class="space-y-2.5 mb-7 flex-1">
					{#each ['Kasir dasar untuk 1 toko','Sampai 50 produk','1 pengguna','Laporan penjualan harian'] as item}
						<li class="flex items-start gap-2.5 text-[14px] leading-snug text-ink"><Check class="w-3 h-3 text-success flex-shrink-0 mt-0.5" />{item}</li>
					{/each}
				</ul>
				<Button href="/auth/register" variant="outline" class="w-full h-12 font-bold rounded-lg border-border">Mulai Gratis</Button>
			</div>

			<!-- Pro (featured) -->
			<div class="relative flex flex-col border-[1.5px] border-brand rounded-[22px] p-7 reveal"
				style="background: var(--color-brand); color: white">
				<div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cta text-white font-mono text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap">Paling Populer</div>
				<div class="font-bold text-[20px] mb-1.5">Pro</div>
				<div class="text-[13.5px] mb-5" style="color: rgba(255,255,255,.8)">Buat usaha yang mau berkembang</div>
				<div class="font-mono font-bold text-[2.2rem] mb-1">Rp 99rb</div>
				<div class="text-[13px] mb-6" style="color: rgba(255,255,255,.8)">per bulan</div>
				<ul class="space-y-2.5 mb-7 flex-1">
					{#each ['Semua fitur paket Gratis','Produk & transaksi tanpa batas','Sampai 5 pengguna','Semua laporan keuangan','Integrasi WhatsApp & QRIS','Cetak barcode & label'] as item}
						<li class="flex items-start gap-2.5 text-[14px] leading-snug"><Check class="w-3 h-3 flex-shrink-0 mt-0.5" style="color: #C9891A" />{item}</li>
					{/each}
				</ul>
				<Button href="/auth/register" class="w-full h-12 font-bold rounded-lg bg-white text-brand hover:bg-white/90">Coba Gratis 14 Hari</Button>
			</div>

			<!-- Business -->
			<div class="flex flex-col bg-paper border-[1.5px] border-border rounded-[22px] p-7 reveal hover:border-ink/20 transition-colors">
				<div class="font-bold text-[20px] text-ink mb-1.5">Bisnis</div>
				<div class="text-[13.5px] text-ink-soft mb-5">Buat usaha dengan banyak cabang</div>
				<div class="font-mono font-bold text-[2.2rem] text-ink mb-1">Rp 249rb</div>
				<div class="text-[13px] text-ink-soft mb-6">per bulan</div>
				<ul class="space-y-2.5 mb-7 flex-1">
					{#each ['Semua fitur paket Pro','Multi-cabang & multi-gudang','Pengguna tanpa batas','Asisten AI lengkap','Integrasi marketplace','Dukungan prioritas'] as item}
						<li class="flex items-start gap-2.5 text-[14px] leading-snug text-ink"><Check class="w-3 h-3 text-success flex-shrink-0 mt-0.5" />{item}</li>
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
		<p class="text-white/90 text-[1.1rem] max-w-[520px] mx-auto mb-9 reveal">Gabung dengan ribuan pelaku usaha yang sudah bikin urusan toko mereka lebih beres.</p>
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
					<div class="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-lg -rotate-6 group-hover:rotate-0 transition-transform">B</div>
					<span class="font-bold text-[22px] text-white">Beres</span>
				</a>
				<p class="text-[14px] text-[#AEB3C8] mb-5 max-w-[280px] leading-relaxed">Beres membantu pelaku UMKM mengelola seluruh kebutuhan bisnis dalam satu aplikasi yang mudah dipakai, dari kasir sampai laporan keuangan.</p>
			</div>
			{#each [['Produk',['Kasir & POS','Stok & Gudang','Keuangan','Asisten AI']],['Perusahaan',['Tentang Kami','Blog','Karier','Hubungi Kami']],['Bantuan',['FAQ','Pusat Bantuan','Tutorial','Status Sistem']]] as [title, links]}
				<div>
					<h3 class="font-sans text-[13.5px] uppercase tracking-[.06em] text-white mb-4 font-bold">{title}</h3>
					<ul class="space-y-3">
						{#each links as link}
							<li><a href="/" class="text-[14.5px] hover:text-white transition-colors">{link}</a></li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
		<div class="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-mono text-white/60">
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
