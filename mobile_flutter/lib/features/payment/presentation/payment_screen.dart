import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/models/payment.dart';
import '../../../shared/providers/payment_provider.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  final String orderId;
  final double total;
  const PaymentScreen({super.key, this.orderId = '', this.total = 0});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  final _dpCtrl = TextEditingController();
  final _cicilanCtrl = TextEditingController(text: '3');
  final _cashPaidCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.total > 0) {
        ref.read(paymentProvider.notifier).setAmount(widget.total);
        _cashPaidCtrl.text = widget.total.toInt().toString();
      }
    });
  }

  @override
  void dispose() {
    _dpCtrl.dispose();
    _cicilanCtrl.dispose();
    _cashPaidCtrl.dispose();
    super.dispose();
  }

  void _setCashAmount(double val) {
    setState(() {
      _cashPaidCtrl.text = val.toInt().toString();
    });
  }

  void _generateInstallments() {
    final n = int.tryParse(_cicilanCtrl.text) ?? 3;
    final total = ref.read(paymentProvider).amount;
    if (n <= 0 || total <= 0) return;
    final per = (total / n).floorToDouble();
    final list = List.generate(n, (i) {
      final amt = i == n - 1 ? total - per * (n - 1) : per;
      return Installment(
        amount: amt,
        dueDate: DateTime.now().add(Duration(days: 30 * (i + 1))),
      );
    });
    ref.read(paymentProvider.notifier).setInstallments(list);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(paymentProvider);
    final theme = Theme.of(context);
    final double cashPaid = double.tryParse(_cashPaidCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    final double change = cashPaid - state.amount;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        title: const Text('Proses Pembayaran', style: TextStyle(fontWeight: FontWeight.w800)),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(18),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: EdgeInsets.only(left: 16, bottom: 8),
              child: Text(
                'Pilih metode — Tunai, QRIS, Kasbon, atau DP',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.orderId.isEmpty || widget.total == 0)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.warningBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, size: 18, color: AppColors.warning),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'Mode demo / tanpa ID order aktif. Pilih order terlebih dahulu untuk transaksi riil.',
                            style: TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fade(duration: 200.ms),

                // Total Tagihan Header Box
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      const Text('TOTAL TAGIHAN', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.textSecondary)),
                      const SizedBox(height: 4),
                      Text(
                        AppColors.formatRupiah(state.amount),
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 28, color: AppColors.primary),
                      ),
                    ],
                  ),
                ).animate().fade(duration: 200.ms),
                const SizedBox(height: 16),

                // Payment Method Selector
                SegmentedButton<PaymentMethod>(
                  segments: const [
                    ButtonSegment(value: PaymentMethod.cash, label: Text('Tunai'), icon: Icon(Icons.payments)),
                    ButtonSegment(value: PaymentMethod.qris, label: Text('QRIS'), icon: Icon(Icons.qr_code)),
                    ButtonSegment(value: PaymentMethod.kasbon, label: Text('Kasbon'), icon: Icon(Icons.receipt_long)),
                    ButtonSegment(value: PaymentMethod.dp, label: Text('DP'), icon: Icon(Icons.account_balance_wallet)),
                  ],
                  selected: {state.method},
                  onSelectionChanged: (s) => ref.read(paymentProvider.notifier).setMethod(s.first),
                ),
                const SizedBox(height: 16),

                // Method Specific Section
                if (state.method == PaymentMethod.cash)
                  _CashSection(
                    total: state.amount,
                    cashPaidCtrl: _cashPaidCtrl,
                    onSelectAmount: _setCashAmount,
                    change: change,
                    onChanged: () => setState(() {}),
                  ).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 200.ms),

                if (state.method == PaymentMethod.qris)
                  _QrisSection(state: state).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 200.ms),

                if (state.method == PaymentMethod.kasbon)
                  _KasbonSection(
                    state: state,
                    cicilanCtrl: _cicilanCtrl,
                    onGenerate: _generateInstallments,
                  ).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 200.ms),

                if (state.method == PaymentMethod.dp)
                  _DpSection(dpCtrl: _dpCtrl).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 200.ms),

                const SizedBox(height: 20),
                if (state.error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      state.error!,
                      style: TextStyle(color: theme.colorScheme.error, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),

                // Submit Payment Button
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: state.loading
                        ? null
                        : () async {
                            if (state.method == PaymentMethod.dp) {
                              final v = double.tryParse(_dpCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
                              ref.read(paymentProvider.notifier).setDpAmount(v);
                            }
                            await ref.read(paymentProvider.notifier).submit(orderId: widget.orderId.isEmpty ? 'DEMO_ORDER' : widget.orderId);
                            if (!context.mounted) return;
                            final s = ref.read(paymentProvider);
                            if (s.error == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Pembayaran ${s.lastPayment?.method.label ?? ''} Berhasil!'),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            }
                          },
                    icon: const Icon(Icons.check_circle_outline, size: 20),
                    label: state.loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text('BAYAR SEKARANG (${state.method.label.toUpperCase()})', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ).animate().scaleXY(begin: 0.98, end: 1, duration: 200.ms),

                if (state.lastPayment != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.successBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                    ),
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, size: 20, color: AppColors.success),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Transaksi Berhasil: Status ${state.lastPayment!.status.label}',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fade(duration: 250.ms).scaleXY(begin: 0.96, end: 1, duration: 250.ms),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CashSection extends StatelessWidget {
  final double total;
  final TextEditingController cashPaidCtrl;
  final ValueChanged<double> onSelectAmount;
  final double change;
  final VoidCallback onChanged;

  const _CashSection({
    required this.total,
    required this.cashPaidCtrl,
    required this.onSelectAmount,
    required this.change,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final suggestions = [
      total,
      10000.0,
      20000.0,
      50000.0,
      100000.0,
    ];

    return FCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Pembayaran Tunai', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(height: 10),
            TextField(
              controller: cashPaidCtrl,
              keyboardType: TextInputType.number,
              onChanged: (_) => onChanged(),
              decoration: InputDecoration(
                labelText: 'Jumlah Uang Diterima (Rp)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                prefixIcon: const Icon(Icons.money, size: 20),
              ),
            ),
            const SizedBox(height: 10),

            // Quick Denomination Chips
            const Text('Pecahan Cepat:', style: TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: suggestions.map((amt) {
                final label = amt == total ? 'Uang Pas' : AppColors.formatRupiah(amt);
                return ActionChip(
                  label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  backgroundColor: AppColors.primaryContainer,
                  labelStyle: const TextStyle(color: AppColors.primary),
                  onPressed: () => onSelectAmount(amt),
                );
              }).toList(),
            ),
            const SizedBox(height: 14),

            // Change Calculation Display
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: change >= 0 ? AppColors.successBg : AppColors.warningBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: change >= 0 ? AppColors.success.withValues(alpha: 0.3) : AppColors.warning.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    change >= 0 ? 'KEMBALIAN' : 'KURANG',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      color: change >= 0 ? AppColors.success : AppColors.warning,
                    ),
                  ),
                  Text(
                    AppColors.formatRupiah(change.abs()),
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      color: change >= 0 ? AppColors.success : AppColors.warning,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QrisSection extends StatelessWidget {
  final PaymentState state;
  const _QrisSection({required this.state});

  @override
  Widget build(BuildContext context) {
    return FCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text('Pembayaran QRIS Standar', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(height: 12),
            Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(14),
                color: Colors.white,
              ),
              child: state.qrisPayload == null || state.qrisPayload!.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.qr_code_2, size: 80, color: AppColors.primary),
                          SizedBox(height: 6),
                          Text('QRIS Siap', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                    )
                  : Center(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          state.qrisPayload!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                    ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Pelanggan scan QRIS dari aplikasi GoPay, OVO, ShopeePay, DANA, atau M-Banking',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _KasbonSection extends StatelessWidget {
  final PaymentState state;
  final TextEditingController cicilanCtrl;
  final VoidCallback onGenerate;

  const _KasbonSection({
    required this.state,
    required this.cicilanCtrl,
    required this.onGenerate,
  });

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('dd MMM yyyy');

    return FCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Skema Kasbon / Cicilan', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: cicilanCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Jumlah Tenor Cicilan',
                      hintText: '3',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: onGenerate,
                  icon: const Icon(Icons.calculate, size: 18),
                  label: const Text('Hitung'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryContainer,
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (state.installments.isEmpty)
              const Text(
                'Belum ada jadwal cicilan. Tentukan tenor lalu tekan Hitung.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              )
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowHeight: 38,
                  dataRowMinHeight: 36,
                  columns: const [
                    DataColumn(label: Text('#', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Nominal', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Jatuh Tempo', style: TextStyle(fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Status', style: TextStyle(fontWeight: FontWeight.bold))),
                  ],
                  rows: [
                    for (var i = 0; i < state.installments.length; i++)
                      DataRow(cells: [
                        DataCell(Text('${i + 1}')),
                        DataCell(Text(AppColors.formatRupiah(state.installments[i].amount))),
                        DataCell(Text(df.format(state.installments[i].dueDate))),
                        DataCell(
                          Row(
                            children: [
                              Icon(
                                state.installments[i].paid ? Icons.check_circle : Icons.schedule,
                                size: 16,
                                color: state.installments[i].paid ? AppColors.success : AppColors.warning,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                state.installments[i].paid ? 'Lunas' : 'Belum',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: state.installments[i].paid ? AppColors.success : AppColors.warning,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ]),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DpSection extends StatelessWidget {
  final TextEditingController dpCtrl;
  const _DpSection({required this.dpCtrl});

  @override
  Widget build(BuildContext context) {
    return FCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Pembayaran Uang Muka (DP)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(height: 12),
            TextField(
              controller: dpCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Nominal DP (Rp)',
                hintText: '50000',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                prefixText: 'Rp ',
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Sisa pembayaran otomatis dicatat sebagai tagihan piutang / kasbon.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
