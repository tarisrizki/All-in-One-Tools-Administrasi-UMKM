import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/services/api_client.dart';
import '../../../shared/services/auth_storage.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Map<String, dynamic>? _subscription;
  String? _subError;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _subError = null;
    });
    try {
      try {
        await ApiClient.init();
      } catch (_) {}
      final sub = await ApiClient.instance.getSubscription();
      if (mounted) setState(() => _subscription = sub);
    } catch (_) {
      if (mounted) setState(() => _subError = 'Gagal memuat status langganan');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await AuthStorage.clearSession();
    if (!mounted) return;
    context.go('/auth/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(8)),
              child: const Center(child: Text('B', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16))),
            ),
            const SizedBox(width: 10),
            const Text('Beres Kasir', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(width: 8),
            Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: AppColors.primaryContainer, borderRadius: BorderRadius.circular(20)), child: Text(_subBadge(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary))),
          ],
        ),
        actions: [
          IconButton(tooltip: 'Keluar', onPressed: _logout, icon: const Icon(Icons.logout, size: 20)),
          const SizedBox(width: 4),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, c) {
          final wide = c.maxWidth >= 900;
          return SingleChildScrollView(
            padding: EdgeInsets.all(wide ? 32 : 16),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Ringkasan Toko',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.5,
                              ),
                        ),
                        const Spacer(),
                        ElevatedButton.icon(
                          onPressed: _load,
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Refresh'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primary,
                            elevation: 0,
                            side: const BorderSide(color: AppColors.border),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Kelola transaksi POS, produk, dan laporan dalam satu dasbor cepat.',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 20),

                    // Top Stat Cards Row
                    LayoutBuilder(
                      builder: (context, inner) {
                        final w = inner.maxWidth;
                        final cols = w >= 900 ? 3 : w >= 600 ? 2 : 1;
                        return GridView.count(
                          crossAxisCount: cols,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 14,
                          childAspectRatio: wide ? 1.6 : 1.35,
                          children: [
                            _StatCard(
                              icon: Icons.point_of_sale,
                              tint: AppColors.primaryContainer,
                              color: AppColors.primary,
                              title: 'Penjualan Hari Ini',
                              value: 'Rp 0',
                              sub: 'Siap menerima transaksi',
                            ).animate().fade(duration: 220.ms).slideY(begin: 0.06, end: 0, duration: 240.ms),
                            _StatCard(
                              icon: Icons.trending_up,
                              tint: AppColors.successBg,
                              color: AppColors.success,
                              title: 'Pendapatan Bersih',
                              value: 'Rp 0',
                              sub: 'Update otomatis',
                            ).animate(delay: 60.ms).fade(duration: 220.ms).slideY(begin: 0.06, end: 0, duration: 240.ms),
                            _StatCard(
                              icon: Icons.verified_user_outlined,
                              tint: AppColors.warningBg,
                              color: AppColors.warning,
                              title: 'Status Langganan',
                              value: _subValue(),
                              sub: _loading ? 'Memuat…' : 'Versi Beres UMKM',
                              loading: _loading,
                            ).animate(delay: 120.ms).fade(duration: 220.ms).slideY(begin: 0.06, end: 0, duration: 240.ms),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 28),

                    const Text('Menu Utama Kasir', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                    const SizedBox(height: 4),
                    const Text('Pilih modul untuk mengakses fitur secara cepat.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    const SizedBox(height: 16),

                    // Quick Action Menu Grid
                    LayoutBuilder(
                      builder: (context, inner) {
                        final w = inner.maxWidth;
                        final cols = w >= 900 ? 4 : w >= 600 ? 3 : 2;
                        return GridView.count(
                          crossAxisCount: cols,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 14,
                          childAspectRatio: 1.4,
                          children: [
                            for (var i = 0; i < _menuTiles.length; i++)
                              _menuTiles[i]
                                  .animate(delay: Duration(milliseconds: 30 * i))
                                  .fade(duration: 200.ms)
                                  .slideY(begin: 0.04, end: 0, duration: 200.ms),
                          ],
                        );
                      },
                    ),

                    if (_subError != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.errorBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, size: 18, color: AppColors.error),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _subError!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    const Text(
                      '© Beres UMKM Ecosystem — Offline-first Desktop POS Solution',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  String _subValue() {
    if (_loading) return 'Memuat…';
    if (_subscription == null) return 'Offline';
    final data = _subscription!['data'];
    if (data is Map) {
      final active = data['active'];
      if (active == true) return 'Aktif';
      if (active == false) return 'Tidak aktif';
      final plan = data['plan'];
      if (plan != null) return plan.toString();
    }
    return 'Aktif';
  }

  String _subBadge() {
    if (_loading) return '—';
    if (_subscription == null) return 'Offline Mode';
    final d = _subscription!['data'];
    if (d is Map && d['active'] == true) return 'Aktif';
    if (d is Map && d['active'] == false) return 'Perlu Aktivasi';
    return 'Siap';
  }
}

const _menuTiles = [
  _MenuTile(
    icon: Icons.point_of_sale,
    label: 'Kasir POS',
    desc: 'Buka register & transaksi',
    route: '/orders',
    tint: AppColors.primaryContainer,
    color: AppColors.primary,
  ),
  _MenuTile(
    icon: Icons.inventory_2_outlined,
    label: 'Katalog & Stok',
    desc: 'SKU, kategori, varian',
    route: '/products',
    tint: AppColors.infoBg,
    color: AppColors.info,
  ),
  _MenuTile(
    icon: Icons.payments_outlined,
    label: 'Pembayaran',
    desc: 'Tunai • QRIS • Kasbon',
    route: '/payment',
    tint: AppColors.successBg,
    color: AppColors.success,
  ),
  _MenuTile(
    icon: Icons.store_outlined,
    label: 'Multi-Outlet',
    desc: 'Cabang & gudang toko',
    route: '/outlet',
    tint: AppColors.primaryContainer,
    color: AppColors.primary,
  ),
  _MenuTile(
    icon: Icons.price_change_outlined,
    label: 'Harga Grosir',
    desc: 'Tier & promosi harga',
    route: '/pricing',
    tint: AppColors.warningBg,
    color: AppColors.warning,
  ),
  _MenuTile(
    icon: Icons.print_outlined,
    label: 'Cetak Struk',
    desc: 'Thermal printer ESC/POS',
    route: '/printing',
    tint: AppColors.successBg,
    color: AppColors.success,
  ),
  _MenuTile(
    icon: Icons.local_offer_outlined,
    label: 'Diskon & Kupon',
    desc: 'Kupon & potongan harga',
    route: '/promo/discount',
    tint: AppColors.errorBg,
    color: AppColors.error,
  ),
  _MenuTile(
    icon: Icons.card_giftcard_outlined,
    label: 'Program Loyalty',
    desc: 'Poin & member toko',
    route: '/promo/loyalty',
    tint: AppColors.warningBg,
    color: AppColors.warning,
  ),
  _MenuTile(
    icon: Icons.bar_chart_outlined,
    label: 'Laporan Penjualan',
    desc: 'Analisis & perputaran stok',
    route: '/reports',
    tint: AppColors.primaryContainer,
    color: AppColors.primary,
  ),
  _MenuTile(
    icon: Icons.table_restaurant_outlined,
    label: 'Manajemen Meja',
    desc: 'Layout F&B & dine-in',
    route: '/tables',
    tint: AppColors.successBg,
    color: AppColors.success,
  ),
];

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.tint,
    required this.color,
    required this.title,
    required this.value,
    required this.sub,
    this.loading = false,
  });

  final IconData icon;
  final Color tint;
  final Color color;
  final String title;
  final String value;
  final String sub;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 14),
          Text(title, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          if (loading)
            const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
          else
            Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, letterSpacing: -0.5)),
          const SizedBox(height: 4),
          Text(sub, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.label,
    required this.desc,
    required this.route,
    required this.tint,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String desc;
  final String route;
  final Color tint;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('nav-$route'),
        onTap: () => context.go(route),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 20),
              ),
              const Spacer(),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
              const SizedBox(height: 2),
              Text(desc, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }
}
