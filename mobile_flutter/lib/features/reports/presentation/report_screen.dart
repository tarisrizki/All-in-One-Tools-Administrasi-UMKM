import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
    final state = ref.watch(reportProvider);
    final notifier = ref.read(reportProvider.notifier);
    final df = DateFormat('dd MMM yyyy');

    return Scaffold(
      appBar: AppBar(title: const Text('Laporan')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Role-based restriction placeholder
          // ponytail: real check = ref.watch(authSessionProvider)?.permissions.contains('reports:view')
          Container(
            key: const Key('roleRestrictionBanner'),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.warningBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              'Akses laporan: semua role (placeholder — batasi via permissions di authSession)',
              style: TextStyle(fontSize: 12),
            ),
          ),
          const SizedBox(height: 12),

          // Period selector + date range
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
              OutlinedButton.icon(
                key: const Key('dateRangeButton'),
                onPressed: _pickRange,
                icon: const Icon(Icons.date_range, size: 18),
                label: Text('${df.format(state.from)} – ${df.format(state.to)}'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (state.loading) const Center(child: CircularProgressIndicator()),
          if (state.error != null)
            Text(state.error!, style: const TextStyle(color: AppColors.error)),

          // Sales chart placeholder
          Container(
            key: const Key('salesChartPlaceholder'),
            height: 160,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.surfaceMuted),
              borderRadius: BorderRadius.circular(12),
            ),
            child: state.sales.isEmpty
                ? const Center(child: Text('Belum ada data penjualan'))
                : _SalesChartPlaceholder(sales: state.sales),
          ),
          const SizedBox(height: 16),

          // Stock turnover table
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
          const SizedBox(height: 16),

          // Export button
          FilledButton.icon(
            key: const Key('exportButton'),
            onPressed: state.loading
                ? null
                : () async {
                    final path = await notifier.exportCsv();
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('CSV tersimpan: $path')),
                    );
                  },
            icon: const Icon(Icons.download),
            label: const Text('Export PDF/Excel (CSV)'),
          ),
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
