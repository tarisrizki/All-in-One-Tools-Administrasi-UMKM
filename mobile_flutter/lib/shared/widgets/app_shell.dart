import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  final String location;
  const AppShell({super.key, required this.child, required this.location});

  static const _tabs = [
    _Tab('/home', Icons.dashboard_outlined, Icons.dashboard, 'Home'),
    _Tab('/products', Icons.inventory_2_outlined, Icons.inventory_2, 'Produk'),
    _Tab('/orders', Icons.receipt_long_outlined, Icons.receipt_long, 'Kasir'),
    _Tab('/payment', Icons.payments_outlined, Icons.payments, 'Bayar'),
    _Tab('/reports', Icons.bar_chart_outlined, Icons.bar_chart, 'Laporan'),
    _Tab('/tables', Icons.table_restaurant_outlined, Icons.table_restaurant, 'Meja'),
    _Tab('/outlet', Icons.store_outlined, Icons.store, 'Outlet'),
  ];

  int get _idx {
    final p = location;
    for (var i = 0; i < _tabs.length; i++) {
      if (p.startsWith(_tabs[i].route)) return i;
    }
    return 0;
  }

  bool get _isAuth => location.startsWith('/auth');

  @override
  Widget build(BuildContext context) {
    if (_isAuth) return child;
    final wide = MediaQuery.sizeOf(context).width >= 900;
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Row(children: [
        if (wide) _SideNav(idx: _idx),
        Expanded(child: child),
      ]),
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              selectedIndex: _idx.clamp(0, _tabs.length - 1),
              onDestinationSelected: (i) => context.go(_tabs[i].route),
              backgroundColor: Colors.white,
              indicatorColor: AppColors.primaryContainer,
              destinations: [for (final t in _tabs) NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon, color: AppColors.primary), label: t.label)],
            ),
    );
  }
}

class _SideNav extends StatelessWidget {
  final int idx;
  const _SideNav({required this.idx});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      color: Colors.white,
      child: Column(children: [
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            Container(width: 36, height: 36, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)), child: const Center(child: Text('B', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)))),
            const SizedBox(width: 10),
            const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Beres Kasir', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)), Text('POS UMKM', style: TextStyle(fontSize: 11, color: AppColors.textSecondary))]),
          ]),
        ),
        const Divider(height: 24, color: AppColors.border),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            children: [
              for (var i = 0; i < AppShell._tabs.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: ListTile(
                    key: ValueKey('nav-${AppShell._tabs[i].route}'),
                    leading: Icon(AppShell._tabs[i].icon, size: 20, color: i == idx ? AppColors.primary : AppColors.textSecondary),
                    title: Text(AppShell._tabs[i].label, style: TextStyle(fontWeight: i == idx ? FontWeight.w700 : FontWeight.w500, fontSize: 13, color: i == idx ? AppColors.primary : Colors.black87)),
                    selected: i == idx,
                    selectedTileColor: AppColors.primaryContainer,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    dense: true,
                    onTap: () => context.go(AppShell._tabs[i].route),
                  ),
                ),
              const Divider(height: 16, color: AppColors.border),
              ListTile(leading: const Icon(Icons.print_outlined, size: 20, color: AppColors.textSecondary), title: const Text('Cetak', style: TextStyle(fontSize: 13)), dense: true, onTap: () => context.go('/printing')),
              ListTile(leading: const Icon(Icons.local_offer_outlined, size: 20, color: AppColors.textSecondary), title: const Text('Promo', style: TextStyle(fontSize: 13)), dense: true, onTap: () => context.go('/promo/discount')),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: AppColors.primaryContainer, borderRadius: BorderRadius.circular(12)), child: Row(children: [const Icon(Icons.verified_user, size: 16, color: AppColors.primary), const SizedBox(width: 8), const Expanded(child: Text('v0.1.0 • Offline-first', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary)))])),
        ),
      ]),
    );
  }
}

class _Tab {
  final String route; final IconData icon; final IconData selectedIcon; final String label;
  const _Tab(this.route, this.icon, this.selectedIcon, this.label);
}
