import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/models/pricing.dart';
import '../../../shared/providers/pricing_provider.dart';

class PricingScreen extends ConsumerStatefulWidget {
  const PricingScreen({super.key, required this.productId});
  final String productId;

  @override
  ConsumerState<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends ConsumerState<PricingScreen> {
  final _costCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController();
  final _hargaCtrl = TextEditingController();
  double _tax = 0;
  DateTime? _expiry;
  List<WholesaleTier> _tiers = [];
  bool _init = false;
  bool _saving = false;

  @override
  void dispose() {
    _costCtrl.dispose();
    _qtyCtrl.dispose();
    _hargaCtrl.dispose();
    super.dispose();
  }

  void _syncFrom(PricingConfig c) {
    if (_init) return;
    _costCtrl.text = c.costPrice == 0 ? '' : c.costPrice.toStringAsFixed(0);
    _tax = c.taxRate.clamp(0, 1);
    _tiers = List.of(c.wholesaleTiers);
    _expiry = c.expiryDate;
    _init = true;
  }

  void _addTier() {
    final q = int.tryParse(_qtyCtrl.text.trim());
    final h = int.tryParse(_hargaCtrl.text.trim().replaceAll('.', '').replaceAll(',', ''));
    if (q == null || q <= 0 || h == null || h <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Qty & harga harus > 0')));
      return;
    }
    if (_tiers.any((e) => e.qty == q)) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Qty $q sudah ada')));
      return;
    }
    setState(() {
      _tiers.add(WholesaleTier(qty: q, harga: h));
      _tiers.sort((a, b) => a.qty.compareTo(b.qty));
      _qtyCtrl.clear();
      _hargaCtrl.clear();
    });
  }

  Future<void> _pickExpiry() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _expiry ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (d != null) setState(() => _expiry = d);
  }

  Future<void> _save(PricingConfig current) async {
    final cost = double.tryParse(_costCtrl.text.trim().replaceAll(',', '.'));
    if (cost == null || cost < 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Harga modal tidak valid')));
      return;
    }
    setState(() => _saving = true);
    final cfg = PricingConfig(
      productId: widget.productId,
      costPrice: cost,
      wholesaleTiers: _tiers,
      taxRate: _tax,
      expiryDate: _expiry,
    );
    await ref.read(pricingProvider(widget.productId).notifier).save(cfg);
    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Harga disimpan')));
  }

  String _fmtDate(DateTime d) {
    try {
      return DateFormat('dd MMM yyyy').format(d);
    } catch (_) {
      return '${d.day}/${d.month}/${d.year}';
    }
  }

  String _fmtHarga(int v) {
    try {
      return NumberFormat.decimalPattern().format(v);
    } catch (_) {
      return '$v';
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(pricingProvider(widget.productId));
    ref.listen(pricingProvider(widget.productId), (prev, next) {
      next.whenOrNull(error: (e, _) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      });
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Harga & Biaya')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Gagal memuat: $e')),
        data: (cfg) {
          _syncFrom(cfg);
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _ExpiryNotice(expiry: _expiry),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text('Harga Modal', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _costCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Harga Modal (Rp)',
                                hintText: 'mis. 15000',
                                prefixText: 'Rp ',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text('Harga Grosir', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text('Tier qty → harga (semakin banyak semakin murah)', style: Theme.of(context).textTheme.bodySmall),
                            const SizedBox(height: 12),
                            if (_tiers.isEmpty)
                              const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('Belum ada tier grosir', style: TextStyle(color: Colors.grey)))
                            else
                              Table(
                                columnWidths: const {0: FlexColumnWidth(1), 1: FlexColumnWidth(1), 2: FixedColumnWidth(48)},
                                children: [
                                  const TableRow(children: [Padding(padding: EdgeInsets.all(6), child: Text('Qty', style: TextStyle(fontWeight: FontWeight.w600))), Padding(padding: EdgeInsets.all(6), child: Text('Harga', style: TextStyle(fontWeight: FontWeight.w600))), SizedBox()]),
                                  for (var i = 0; i < _tiers.length; i++)
                                    TableRow(children: [
                                      Padding(padding: const EdgeInsets.all(6), child: Text('${_tiers[i].qty}')),
                                      Padding(padding: const EdgeInsets.all(6), child: Text('Rp ${_fmtHarga(_tiers[i].harga)}')),
                                      IconButton(icon: const Icon(Icons.delete_outline, size: 20), onPressed: () => setState(() => _tiers.removeAt(i))),
                                    ]),
                                ],
                              ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(child: TextField(controller: _qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Qty', hintText: '10'))),
                                const SizedBox(width: 8),
                                Expanded(child: TextField(controller: _hargaCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Harga', hintText: '12000'))),
                                const SizedBox(width: 8),
                                FilledButton(onPressed: _addTier, child: const Text('Tambah')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text('Pajak', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            Row(children: [const Text('0%'), Expanded(child: Slider(value: _tax, min: 0, max: 0.3, divisions: 30, label: '${(_tax * 100).toStringAsFixed(1)}%', onChanged: (v) => setState(() => _tax = v))), const Text('30%')]),
                            Text('Pajak: ${(_tax * 100).toStringAsFixed(1)}%', style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text('Kadaluarsa', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: _pickExpiry,
                              child: InputDecorator(
                                decoration: const InputDecoration(labelText: 'Tanggal kadaluarsa', suffixIcon: Icon(Icons.calendar_today)),
                                child: Text(_expiry == null ? 'Belum diatur' : _fmtDate(_expiry!)),
                              ),
                            ),
                            if (_expiry != null)
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(onPressed: () => setState(() => _expiry = null), child: const Text('Hapus tanggal')),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _saving ? null : () => _save(cfg),
                      child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Simpan Harga'),
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
}

class _ExpiryNotice extends StatelessWidget {
  const _ExpiryNotice({this.expiry});
  final DateTime? expiry;

  @override
  Widget build(BuildContext context) {
    if (expiry == null) return const SizedBox.shrink();
    final now = DateTime.now();
    final diff = expiry!.difference(DateTime(now.year, now.month, now.day)).inDays;
    if (expiry!.isBefore(DateTime(now.year, now.month, now.day))) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.errorContainer, borderRadius: BorderRadius.circular(10)),
        child: Row(children: [Icon(Icons.warning_amber, color: Theme.of(context).colorScheme.error), const SizedBox(width: 8), const Expanded(child: Text('Produk sudah kadaluarsa'))]),
      );
    }
    if (diff <= 7) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.warningBg, borderRadius: BorderRadius.circular(10)),
        child: Row(children: [const Icon(Icons.schedule, color: AppColors.warning), const SizedBox(width: 8), Expanded(child: Text('Kadaluarsa dalam $diff hari'))]),
      );
    }
    return const SizedBox.shrink();
  }
}
