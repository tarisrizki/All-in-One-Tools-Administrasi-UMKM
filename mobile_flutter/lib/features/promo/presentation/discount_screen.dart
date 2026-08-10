import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';
import '../../../shared/models/discount.dart';
import '../../../shared/providers/discount_provider.dart';

class DiscountScreen extends ConsumerStatefulWidget {
  const DiscountScreen({super.key});
  @override
  ConsumerState<DiscountScreen> createState() => _DiscountScreenState();
}

class _DiscountScreenState extends ConsumerState<DiscountScreen> {
  final _formKey = GlobalKey<FormState>();
  DiscountType _type = DiscountType.perTransaction;
  final _valueCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _minCtrl = TextEditingController();
  final _productIdsCtrl = TextEditingController();
  final _promoInputCtrl = TextEditingController();
  String? _promoResult;

  @override
  void dispose() {
    _valueCtrl.dispose();
    _codeCtrl.dispose();
    _minCtrl.dispose();
    _productIdsCtrl.dispose();
    _promoInputCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final d = Discount(
      id: '',
      type: _type,
      value: double.tryParse(_valueCtrl.text) ?? 0,
      code: _codeCtrl.text.trim().isEmpty
          ? null
          : _codeCtrl.text.trim().toUpperCase(),
      minPurchase: double.tryParse(_minCtrl.text) ?? 0,
      applicableProductIds: _productIdsCtrl.text.trim().isEmpty
          ? const []
          : _productIdsCtrl.text
              .split(',')
              .map((e) => e.trim())
              .where((e) => e.isNotEmpty)
              .toList(),
    );
    await ref.read(discountListProvider.notifier).add(d);
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Diskon disimpan')));
    _valueCtrl.clear();
    _codeCtrl.clear();
  }

  Future<void> _validatePromo() async {
    final code = _promoInputCtrl.text.trim();
    if (code.isEmpty) return;
    final svc = ref.read(discountListProvider.notifier);
    final found = await svc.validate(code, 0);
    setState(() => _promoResult = found == null
        ? 'Kode tidak valid'
        : 'Kode valid: ${found.type.label} ${found.value}');
    if (found != null) ref.read(appliedDiscountProvider.notifier).state = found;
  }

  @override
  Widget build(BuildContext context) {
    final discounts = ref.watch(discountListProvider);
    final applied = ref.watch(appliedDiscountProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Diskon & Promo')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FCard(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Kode Promo',
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: FTextField(
                            control: FTextFieldControl.managed(controller: _promoInputCtrl),
                            label: const Text('Masukkan kode'),
                            hint: 'CONTOH: HEMAT10',
                          ),
                        ),
                        const SizedBox(width: 8),
                        FButton(
                            onPress: _validatePromo,
                            child: const Text('Validasi')),
                      ],
                    ),
                    if (_promoResult != null) ...[
                      const SizedBox(height: 8),
                      Text(_promoResult!,
                          style: TextStyle(
                              color: _promoResult!.startsWith('Kode valid')
                                  ? AppColors.success
                                  : AppColors.error)),
                    ],
                    if (applied != null) ...[
                      const SizedBox(height: 8),
                      FBadge(child: Text('Terapan: ${applied.code ?? applied.type.label} - ${applied.value}')),
                      const SizedBox(height: 4),
                      FButton(variant: FButtonVariant.ghost, onPress: () => ref.read(appliedDiscountProvider.notifier).state = null, child: const Text('Hapus terapan')),
                    ],
                  ],
                ),
              ),
            ).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
            const SizedBox(height: 16),
            Text('Buat Diskon',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  DropdownButtonFormField<DiscountType>(
                    initialValue: _type,
                    decoration: const InputDecoration(labelText: 'Tipe'),
                    items: DiscountType.values
                        .map((e) =>
                            DropdownMenuItem(value: e, child: Text(e.label)))
                        .toList(),
                    onChanged: (v) => setState(
                        () => _type = v ?? DiscountType.perTransaction),
                  ),
                  const SizedBox(height: 12),
                  FTextField(
                    control: FTextFieldControl.managed(controller: _valueCtrl),
                    label: const Text('Nilai (persen ≤100 atau nominal)'),
                    hint: '10',
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  FTextField(
                      control: FTextFieldControl.managed(controller: _codeCtrl),
                      label: const Text('Kode (untuk promoCode)'),
                      hint: 'HEMAT10'),
                  const SizedBox(height: 12),
                  FTextField(
                      control: FTextFieldControl.managed(controller: _minCtrl),
                      label: const Text('Min. Pembelian'),
                      hint: '0',
                      keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  FTextField(
                      control: FTextFieldControl.managed(controller: _productIdsCtrl),
                      label: const Text('Produk terkait (comma-separated IDs)'),
                      hint: 'prod_1, prod_2'),
                  const SizedBox(height: 16),
                  FButton(
                      onPress: _submit, child: const Text('Simpan Diskon')).animate().scaleXY(begin: 0.98, end: 1, duration: 200.ms),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Daftar Diskon',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            discounts.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Gagal: $e'),
              data: (list) {
                if (list.isEmpty) return const Text('Belum ada diskon');
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final d = list[i];
                    return FCard(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        child: ListTile(
                          title: Text(
                              '${d.type.label} — ${d.value}${d.code != null ? ' (${d.code})' : ''}'),
                          subtitle: Text(
                              'Min: ${d.minPurchase} • Produk: ${d.applicableProductIds.isEmpty ? '-' : d.applicableProductIds.join(', ')}'),
                          trailing: IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () => ref
                                  .read(discountListProvider.notifier)
                                  .remove(d.id)),
                        ),
                      ),
                    ).animate().fade(duration: 180.ms, delay: (i * 30).ms).slideY(begin: 0.04, end: 0, duration: 200.ms);
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
