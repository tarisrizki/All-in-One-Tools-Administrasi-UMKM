import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:beres_pos/shared/services/api_client.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';
import 'package:intl/intl.dart';

import '../../../shared/models/report.dart';
import '../../../shared/providers/report_provider.dart';

class ReportScreen extends ConsumerStatefulWidget {
  const ReportScreen({super.key});

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(reportProvider.notifier).load());
  }

  Future<void> _pickRange() async {
    final s = ref.read(reportProvider);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: DateTimeRange(start: s.from, end: s.to),
    );
    if (picked != null) {
      ref.read(reportProvider.notifier).setDateRange(picked.start, picked.end);
      await ref.read(reportProvider.notifier).load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authSessionProvider);
    final perms = session?.permissions ?? const <String>[];
    final canView = perms.contains('reports:read') || perms.contains('admin') || perms.contains('*');
    if (!canView) {
      return Scaffold(
        appBar: AppBar(title: const Text('Laporan')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.block, size: 48, color: AppColors.error),
                const SizedBox(height: 12),
                const Text('Akses ditolak', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Role Anda tidak memiliki izin reports:read.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600])),
                const SizedBox(height: 4),
                Text('Hubungi admin untuk mendapatkan akses laporan.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              ],
            ),
          ),
        ),
      );
    }
    final state = ref.watch(reportProvider);
    final notifier = ref.read(reportProvider.notifier);
    final df = DateFormat('dd MMM yyyy');

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF8),
      appBar: AppBar(backgroundColor: const Color(0xFFFAFAF8), elevation: 0, title: const Text('Laporan', style: TextStyle(fontWeight: FontWeight.w800)), bottom: const PreferredSize(preferredSize: Size.fromHeight(18), child: Align(alignment: Alignment.centerLeft, child: Padding(padding: EdgeInsets.only(left: 16, bottom: 8), child: Text('Penjualan & stok — pilih periode untuk lihat tren', style: TextStyle(color: Color(0xFF71717A), fontSize: 12)))))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              DropdownButton<ReportPeriod>(
                key: const Key('periodDropdown'),
                value: state.period,
                items: ReportPeriod.values
                    .map((p) => DropdownMenuItem(value: p, child: Text(p.label)))
                    .toList(),
                onChanged: (v) async {
                  if (v == null) return;
                  notifier.setPeriod(v);
                  await notifier.load();
                },
              ),
              FButton(
                key: const Key('dateRangeButton'),
                variant: FButtonVariant.outline,
                prefix: const Icon(Icons.date_range, size: 18),
                onPress: _pickRange,
                child: Text('${df.format(state.from)} – ${df.format(state.to)}'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (state.loading) const Center(child: CircularProgressIndicator()),
          if (state.error != null)
            Text(state.error!, style: const TextStyle(color: AppColors.error)),

          FCard(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: SizedBox(
                key: const Key('salesChartPlaceholder'),
                height: 160,
                child: state.sales.isEmpty
                    ? const Center(child: Text('Belum ada data penjualan'))
                    : _SalesChartPlaceholder(sales: state.sales),
              ),
            ),
          ).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
          const SizedBox(height: 16),

          FCard(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Perputaran Stok', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    key: const Key('stockTable'),
                    columns: const [
                      DataColumn(label: Text('Produk')),
                      DataColumn(label: Text('Terjual')),
                      DataColumn(label: Text('Sisa')),
                      DataColumn(label: Text('Turnover')),
                    ],
                    rows: state.stock
                        .map((s) => DataRow(cells: [
                              DataCell(Text(s.productName)),
                              DataCell(Text('${s.soldQty}')),
                              DataCell(Text('${s.stockRemaining}')),
                              DataCell(Text(s.turnoverRate.toStringAsFixed(2))),
                            ]))
                        .toList(),
                  ),
                ),
              ]),
            ),
          ).animate().fade(duration: 200.ms, delay: 80.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
          const SizedBox(height: 16),

          FButton(
            key: const Key('exportButton'),
            prefix: const Icon(Icons.download),
            onPress: state.loading
                ? null
                : () async {
                    final path = await notifier.exportCsv();
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('CSV tersimpan: $path')),
                    );
                  },
            child: const Text('Export PDF/Excel (CSV)'),
          ).animate().scaleXY(begin: 0.98, end: 1, duration: 200.ms),
          if (state.exportedPath != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('File: ${state.exportedPath}',
                  style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ),
        ],
      ),
    );
  }
}

class _SalesChartPlaceholder extends StatelessWidget {
  const _SalesChartPlaceholder({required this.sales});
  final List<SalesReport> sales;

  @override
  Widget build(BuildContext context) {
    if (sales.isEmpty) return const SizedBox();
    final maxSales = sales.map((e) => e.totalSales).reduce((a, b) => a > b ? a : b);
    final df = DateFormat('dd/MM');
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: sales.map((s) {
          final h = maxSales == 0 ? 0.0 : (s.totalSales / maxSales * 100);
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    height: h,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(df.format(s.date), style: const TextStyle(fontSize: 9)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
