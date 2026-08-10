import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/models/payment.dart';
import '../../../shared/providers/payment_provider.dart';

final _fmt =
    NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

/// Layar pembayaran — pilih metode + QR + kasbon cicilan + DP.
/// orderId/total di-pass dari keranjang/checkout; fallback ke dummy jika standalone.
class PaymentScreen extends ConsumerStatefulWidget {
  final String orderId;
  final double total;
  const PaymentScreen(
      {super.key, this.orderId = 'ord-dummy', this.total = 50000});

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
      appBar: AppBar(title: const Text('Pembayaran')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Badge metode aktif
                Align(
                  alignment: Alignment.centerLeft,
                  child: _MethodBadge(method: state.method),
                ),
                const SizedBox(height: 12),
                Text('Total: ${_fmt.format(state.amount)}',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),

                // Pilih metode
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

                // Branch per metode
                if (state.method == PaymentMethod.qris)
                  _QrisSection(state: state),
                if (state.method == PaymentMethod.kasbon)
                  _KasbonSection(
                    state: state,
                    cicilanCtrl: _cicilanCtrl,
                    onGenerate: _generateInstallments,
                  ),
                if (state.method == PaymentMethod.dp)
                  _DpSection(dpCtrl: _dpCtrl),

                const SizedBox(height: 20),
                if (state.error != null)
                  Text(state.error!,
                      style: TextStyle(
                          color: theme.colorScheme.error, fontSize: 13)),
                FilledButton(
                  onPressed: state.loading
                      ? null
                      : () async {
                          // sync dp amount if DP
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
                ),
                if (state.lastPayment != null) ...[
                  const SizedBox(height: 12),
                  Text('Status: ${state.lastPayment!.status.label}',
                      style: theme.textTheme.bodySmall),
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
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(method.badge,
          style: TextStyle(
            color: scheme.onPrimaryContainer,
            fontWeight: FontWeight.w700,
            fontSize: 12,
            letterSpacing: 0.5,
          )),
    );
  }
}

class _QrisSection extends StatelessWidget {
  final PaymentState state;
  const _QrisSection({required this.state});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Text('QRIS',
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          // placeholder QR — real impl swaps with Image.memory(base64Decode(payload))
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
    return Card(
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
              child: TextField(
                controller: cicilanCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'Jumlah cicilan', hintText: '3'),
              ),
            ),
            const SizedBox(width: 12),
            FilledButton.tonal(
                onPressed: onGenerate, child: const Text('Generate')),
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Uang Muka (DP)',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          TextField(
            controller: dpCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Nominal DP',
              prefixText: 'Rp ',
              hintText: '50000',
            ),
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
