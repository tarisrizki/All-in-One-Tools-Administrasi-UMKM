import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/services/api_client.dart';
import '../../../shared/services/auth_storage.dart';

/// Dashboard utama — info umum + status langganan + responsif desktop/mobile.
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
    } catch (e) {
      if (mounted) setState(() => _subError = e.toString());
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
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Beres Kasir'),
        actions: [
          IconButton(
            tooltip: 'Keluar',
            onPressed: _logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 900;
          final padding = EdgeInsets.all(wide ? 32 : 16);
          return SingleChildScrollView(
            padding: padding,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Ringkasan', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      'Detail lengkap ada di aplikasi desktop.',
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 24),
                    // Grid info: lebar → breakpoints.
                    LayoutBuilder(
                      builder: (context, inner) {
                        final w = inner.maxWidth;
                        final cols = w >= 900 ? 3 : w >= 600 ? 2 : 1;
                        final cards = [
                          _InfoCard(
                            icon: Icons.point_of_sale,
                            title: 'Penjualan hari ini',
                            value: '—',
                          ),
                          _InfoCard(
                            icon: Icons.trending_up,
                            title: 'Pendapatan hari ini',
                            value: '—',
                          ),
                          _InfoCard(
                            icon: Icons.verified_user_outlined,
                            title: 'Langganan',
                            value: _subValue(),
                            loading: _loading,
                          ),
                        ];
                        return GridView.count(
                          crossAxisCount: cols,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 16,
                          crossAxisSpacing: 16,
                          childAspectRatio: wide ? 1.6 : 1.4,
                          children: cards,
                        );
                      },
                    ),
                    if (_subError != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Gagal memuat langganan: $_subError',
                        style: TextStyle(color: theme.colorScheme.error, fontSize: 13),
                      ),
                    ],
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
    if (_subscription == null) return '—';
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
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.title,
    required this.value,
    this.loading = false,
  });

  final IconData icon;
  final String title;
  final String value;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: theme.colorScheme.primary, size: 28),
            const SizedBox(height: 12),
            Text(title, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 8),
            if (loading)
              const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
            else
              Text(
                value,
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
          ],
        ),
      ),
    );
  }
}
