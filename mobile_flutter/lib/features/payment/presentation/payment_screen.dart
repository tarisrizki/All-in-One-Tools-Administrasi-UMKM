import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';
import 'package:intl/intl.dart';

import '../../../shared/models/payment.dart';
import '../../../shared/providers/payment_provider.dart';

final _fmt =
    NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(paymentProvider.notifier).setAmount(widget.total);
    });
  }

  @override
  void dispose() {
    _dpCtrl.dispose();
    _cicilanCtrl.dispose();
    super.dispose();
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

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF8),
      appBar: AppBar(backgroundColor: const Color(0xFFFAFAF8), elevation: 0, title: const Text('Pembayaran', style: TextStyle(fontWeight: FontWeight.w800)), bottom: const PreferredSize(preferredSize: Size.fromHeight(18), child: Align(alignment: Alignment.centerLeft, child: Padding(padding: EdgeInsets.only(left: 16, bottom: 8), child: Text('Tunai • QRIS • Kasbon • DP', style: TextStyle(color: Color(0xFF71717A), fontSize: 12)))))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.orderId.isEmpty || widget.total == 0)
                  FCard(child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [Container(padding: const EdgeInsets.all(7), decoration: BoxDecoration(color: const Color(0xFFFBF0DA), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.info_outline, size: 16, color: Color(0xFFC9891A))), const SizedBox(width: 10), const Expanded(child: Text('Tidak ada order untuk dibayar — kembali dan pilih order.', style: TextStyle(fontSize: 12, color: Color(0xFF71717A))))]))).animate().fade(duration: 200.ms),
                _MethodBadge(method: state.method).animate().fade(duration: 200.ms),
                const SizedBox(height: 12),
                Text('Total: ${_fmt.format(state.amount)}',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),

                SegmentedButton<PaymentMethod>(
                  segments: const [
                    ButtonSegment(
                        value: PaymentMethod.cash,
                        label: Text('Tunai'),
                        icon: Icon(Icons.payments)),
                    ButtonSegment(
                        value: PaymentMethod.qris,
                        label: Text('QRIS'),
                        icon: Icon(Icons.qr_code)),
                    ButtonSegment(
                        value: PaymentMethod.kasbon,
                        label: Text('Kasbon'),
                        icon: Icon(Icons.receipt_long)),
                    ButtonSegment(
                        value: PaymentMethod.dp,
                        label: Text('DP'),
                        icon: Icon(Icons.account_balance_wallet)),
                  ],
                  selected: {state.method},
                  onSelectionChanged: (s) =>
                      ref.read(paymentProvider.notifier).setMethod(s.first),
                ),
                const SizedBox(height: 20),

                if (state.method == PaymentMethod.qris)
                  _QrisSection(state: state).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
                if (state.method == PaymentMethod.kasbon)
                  _KasbonSection(
                    state: state,
                    cicilanCtrl: _cicilanCtrl,
                    onGenerate: _generateInstallments,
                  ).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
                if (state.method == PaymentMethod.dp)
                  _DpSection(dpCtrl: _dpCtrl).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),

                const SizedBox(height: 20),
                if (state.error != null)
                  Text(state.error!,
                      style: TextStyle(
                          color: theme.colorScheme.error, fontSize: 13)),
                FButton(
                  onPress: state.loading || widget.orderId.isEmpty
                      ? null
                      : () async {
                          if (state.method == PaymentMethod.dp) {
                            final v = double.tryParse(_dpCtrl.text
                                    .replaceAll(RegExp(r'[^0-9]'), '')) ??
                                0;
                            ref.read(paymentProvider.notifier).setDpAmount(v);
                          }
                          await ref
                              .read(paymentProvider.notifier)
                              .submit(orderId: widget.orderId);
                          if (!context.mounted) return;
                          final s = ref.read(paymentProvider);
                          if (s.error == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content: Text(
                                      'Pembayaran ${s.lastPayment?.method.label ?? ''} berhasil')),
                            );
                          }
                        },
                  child: state.loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Bayar'),
                ).animate().scaleXY(begin: 0.98, end: 1, duration: 220.ms),
                if (state.lastPayment != null) ...[
                  const SizedBox(height: 12),
                  Container(decoration: BoxDecoration(color: const Color(0xFFDEF4EA), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE8E8EE))), padding: const EdgeInsets.all(12), child: Row(children: [const Icon(Icons.check_circle, size: 18, color: Color(0xFF0E8F5E)), const SizedBox(width: 8), Text('Berhasil: ${state.lastPayment!.status.label}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF0E8F5E)))]))
                      .animate().fade(duration: 250.ms).scaleXY(begin: 0.96, end: 1, duration: 250.ms),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MethodBadge extends StatelessWidget {
  final PaymentMethod method;
  const _MethodBadge({required this.method});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: FBadge(child: Text(method.badge)),
    );
  }
}

class _QrisSection extends StatelessWidget {
  final PaymentState state;
  const _QrisSection({required this.state});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return FCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Text('QRIS',
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              border: Border.all(color: theme.colorScheme.outlineVariant),
              borderRadius: BorderRadius.circular(12),
              color: theme.colorScheme.surfaceContainerHighest,
            ),
            child: state.qrisPayload == null || state.qrisPayload!.isEmpty
                ? const Center(child: Icon(Icons.qr_code_2, size: 64))
                : Center(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        state.qrisPayload!,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ),
          ),
          const SizedBox(height: 8),
          Text(
            state.qrisPayload == null
                ? 'Tap Bayar untuk generate QR'
                : 'Scan QR untuk bayar',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ]),
      ),
    );
  }
}

class _KasbonSection extends StatelessWidget {
  final PaymentState state;
  final TextEditingController cicilanCtrl;
  final VoidCallback onGenerate;
  const _KasbonSection(
      {required this.state,
      required this.cicilanCtrl,
      required this.onGenerate});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return FCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Kasbon — Cicilan',
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: FTextField(
                control: FTextFieldControl.managed(controller: cicilanCtrl),
                label: const Text('Jumlah cicilan'),
                hint: '3',
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 12),
            FButton(variant: FButtonVariant.secondary, onPress: onGenerate, child: const Text('Generate')),
          ]),
          const SizedBox(height: 12),
          if (state.installments.isEmpty)
            Text('Belum ada cicilan. Atur jumlah lalu Generate.',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant))
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                headingRowHeight: 36,
                dataRowMinHeight: 36,
                columns: const [
                  DataColumn(label: Text('#')),
                  DataColumn(label: Text('Nominal')),
                  DataColumn(label: Text('Jatuh Tempo')),
                  DataColumn(label: Text('Lunas')),
                ],
                rows: [
                  for (var i = 0; i < state.installments.length; i++)
                    DataRow(cells: [
                      DataCell(Text('${i + 1}')),
                      DataCell(Text(_fmt.format(state.installments[i].amount))),
                      DataCell(Text(DateFormat('dd MMM yyyy')
                          .format(state.installments[i].dueDate))),
                      DataCell(Icon(
                        state.installments[i].paid
                            ? Icons.check_circle
                            : Icons.circle_outlined,
                        size: 18,
                        color: state.installments[i].paid
                            ? AppColors.success
                            : theme.colorScheme.outline,
                      )),
                    ]),
                ],
              ),
            ),
        ]),
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
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Uang Muka (DP)',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          FTextField(
            control: FTextFieldControl.managed(controller: dpCtrl),
            label: const Text('Nominal DP'),
            hint: '50000',
            keyboardType: TextInputType.number,
            prefixBuilder: (c, s, vs) => Padding(padding: const EdgeInsetsDirectional.only(start: 10, end: 4), child: Text('Rp', style: TextStyle(color: c.theme.colors.mutedForeground, fontSize: 13))),
          ),
          const SizedBox(height: 8),
          Text('Sisa akan ditagih sebagai kasbon/cicilan.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ]),
      ),
    );
  }
}
