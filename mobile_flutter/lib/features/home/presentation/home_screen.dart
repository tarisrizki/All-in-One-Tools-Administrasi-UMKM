import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
    setState(() { _loading = true; _subError = null; });
    try {
      try { await ApiClient.init(); } catch (_) {}
      final sub = await ApiClient.instance.getSubscription();
      if (mounted) setState(() => _subscription = sub);
    } catch (_) {
      if (mounted) setState(() => _subError = 'Gagal: langganan');
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
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFAFAF8),
        elevation: 0,
        title: Row(children: [
          Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFF2A2F78), borderRadius: BorderRadius.circular(10)), child: const Center(child: Text('B', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)))),
          const SizedBox(width: 10),
          const Text('Beres Kasir', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(width: 8),
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: cs.primaryContainer, borderRadius: BorderRadius.circular(20)), child: Text(_subBadge(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: cs.onPrimaryContainer))),
        ]),
        actions: [
          IconButton(tooltip: 'Bantuan', onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Beres Kasir v0.1.0 — hubungi admin'))), icon: const Icon(Icons.help_outline, size: 20)),
          IconButton(tooltip: 'Keluar', onPressed: _logout, icon: const Icon(Icons.logout, size: 20)),
          const SizedBox(width: 4),
        ],
      ),
      body: LayoutBuilder(builder: (context, c) {
        final wide = c.maxWidth >= 900;
        return SingleChildScrollView(
          padding: EdgeInsets.all(wide ? 32 : 16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1100),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text('Ringkasan', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                  const Spacer(),
                  TextButton.icon(onPressed: _load, icon: const Icon(Icons.refresh, size: 16), label: const Text('Refresh')),
                ]),
                const SizedBox(height: 4),
                Text('Kelola toko lebih rapi — semua menu siap satu ketuk.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                const SizedBox(height: 20),
                LayoutBuilder(builder: (context, inner) {
                  final w = inner.maxWidth;
                  final cols = w >= 900 ? 3 : w >= 600 ? 2 : 1;
                  return GridView.count(
                    crossAxisCount: cols,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: wide ? 1.55 : 1.35,
                    children: [
                      _StatCard(icon: Icons.point_of_sale, tint: const Color(0xFFE7E8F6), color: const Color(0xFF1565C0), title: 'Penjualan hari ini', value: 'Rp 0', sub: 'Belum ada transaksi').animate().fade(duration: 220.ms).slideY(begin: 0.06, end: 0, duration: 240.ms),
                      _StatCard(icon: Icons.trending_up, tint: const Color(0xFFDEF4EA), color: const Color(0xFF0E8F5E), title: 'Pendapatan', value: 'Rp 0', sub: 'Hari ini').animate(delay: 60.ms).fade(duration: 220.ms).slideY(begin: 0.06, end: 0, duration: 240.ms),
                      _StatCard(icon: Icons.verified_user_outlined, tint: const Color(0xFFFBF0DA), color: const Color(0xFFC9891A), title: 'Langganan', value: _subValue(), sub: _loading ? 'Memuat…' : 'Ketuk untuk detail', loading: _loading).animate(delay: 120.ms).fade(duration: 220.ms).slideY(begin: 0.06, end: 0, duration: 240.ms),
                    ],
                  );
                }),
                const SizedBox(height: 28),
                Text('Menu cepat', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 3),
                Text('Pilih tugas — POS, stok, dan laporan dalam satu layar.', style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
                const SizedBox(height: 14),
                LayoutBuilder(builder: (context, inner) {
                  final w = inner.maxWidth;
                  final cols = w >= 900 ? 4 : w >= 600 ? 3 : 2;
                  return GridView.count(
                    crossAxisCount: cols,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.45,
                    children: [
                      for (var i = 0; i < _menuTiles.length; i++)
                        _menuTiles[i].animate(delay: Duration(milliseconds: 40 * i)).fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
                    ],
                  );
                }),
                if (_subError != null) ...[
                  const SizedBox(height: 14),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), decoration: BoxDecoration(color: cs.errorContainer, borderRadius: BorderRadius.circular(10)), child: Row(children: [Icon(Icons.info_outline, size: 16, color: cs.onErrorContainer), const SizedBox(width: 8), Expanded(child: Text(_subError!, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: cs.onErrorContainer, fontSize: 12)))])),
                ],
                const SizedBox(height: 18),
                Text('© Beres UMKM — login dulu untuk data real (offline-first POS)', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
              ]),
            ),
          ),
        );
      }),
    );
  }

  String _subValue() {
    if (_loading) return 'Memuat…';
    if (_subscription == null) return 'Rp 0';
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
    if (_subscription == null) return 'Offline';
    final d = _subscription!['data'];
    if (d is Map && d['active'] == true) return 'Aktif';
    if (d is Map && d['active'] == false) return 'Perlu aktivasi';
    return 'Siap';
  }
}

const _menuTiles = [
  _MenuTile(icon: Icons.inventory_2_outlined, label: 'Produk & Stok', desc: 'SKU, kategori, stok', route: '/products', tint: Color(0xFFE7E8F6), color: Color(0xFF1565C0)),
  _MenuTile(icon: Icons.receipt_long, label: 'Pesanan', desc: 'Dine-in • Takeaway', route: '/orders', tint: Color(0xFFFBE7DD), color: Color(0xFFDD4B1E)),
  _MenuTile(icon: Icons.payments_outlined, label: 'Pembayaran', desc: 'Tunai • QRIS • Kasbon', route: '/payment', tint: Color(0xFFDEF4EA), color: Color(0xFF0E8F5E)),
  _MenuTile(icon: Icons.store_outlined, label: 'Outlet', desc: 'Cabang & gudang', route: '/outlet', tint: Color(0xFFE7E8F6), color: Color(0xFF1565C0)),
  _MenuTile(icon: Icons.price_change_outlined, label: 'Harga Grosir', desc: 'Tier & promo', route: '/pricing', tint: Color(0xFFFBF0DA), color: Color(0xFFC9891A)),
  _MenuTile(icon: Icons.print_outlined, label: 'Cetak Struk', desc: 'Thermal & layout', route: '/printing', tint: Color(0xFFDEF4EA), color: Color(0xFF0E8F5E)),
  _MenuTile(icon: Icons.local_offer_outlined, label: 'Diskon', desc: 'Kupon & promo', route: '/promo/discount', tint: Color(0xFFFBE7DD), color: Color(0xFFDD4B1E)),
  _MenuTile(icon: Icons.card_giftcard_outlined, label: 'Loyalty', desc: 'Poin member', route: '/promo/loyalty', tint: Color(0xFFFBF0DA), color: Color(0xFFC9891A)),
  _MenuTile(icon: Icons.bar_chart_outlined, label: 'Laporan', desc: 'Penjualan & stok', route: '/reports', tint: Color(0xFFE7E8F6), color: Color(0xFF1565C0)),
  _MenuTile(icon: Icons.table_restaurant_outlined, label: 'Meja', desc: 'Dine-in layout', route: '/tables', tint: Color(0xFFDEF4EA), color: Color(0xFF0E8F5E)),
];

class _StatCard extends StatelessWidget {
  const _StatCard({required this.icon, required this.tint, required this.color, required this.title, required this.value, required this.sub, this.loading = false});
  final IconData icon; final Color tint; final Color color; final String title; final String value; final String sub; final bool loading;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE8E8EE))),
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 20)),
        const SizedBox(height: 14),
        Text(title, style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        if (loading) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
        else Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22, letterSpacing: -0.5)),
        const SizedBox(height: 4),
        Text(sub, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
      ]),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.icon, required this.label, required this.desc, required this.route, required this.tint, required this.color});
  final IconData icon; final String label; final String desc; final String route; final Color tint; final Color color;
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFE8E8EE))),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('nav-$route'),
        onTap: () => context.go(route),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 36, height: 36, decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(9)), child: Icon(icon, color: color, size: 18)),
            const Spacer(),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            const SizedBox(height: 2),
            Text(desc, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
          ]),
        ),
      ),
    );
  }
}
