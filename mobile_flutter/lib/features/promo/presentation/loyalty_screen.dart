import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';
import '../../../shared/models/loyalty.dart';
import '../../../shared/providers/loyalty_provider.dart';

class LoyaltyScreen extends ConsumerStatefulWidget {
  const LoyaltyScreen({super.key});
  @override
  ConsumerState<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends ConsumerState<LoyaltyScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _earnCtrl = TextEditingController(text: '1000');
  final _redeemCtrl = TextEditingController(text: '100');

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _earnCtrl.dispose();
    _redeemCtrl.dispose();
    super.dispose();
  }

  Future<void> _addMember() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Nama wajib')));
      return;
    }
    await ref.read(loyaltyListProvider.notifier).add(
          LoyaltyMember(
              id: '',
              name: _nameCtrl.text.trim(),
              phone: _phoneCtrl.text.trim().isEmpty
                  ? null
                  : _phoneCtrl.text.trim()),
        );
    _nameCtrl.clear();
    _phoneCtrl.clear();
  }

  Color _tierColor(LoyaltyTier t) {
    switch (t) {
      case LoyaltyTier.bronze:
        return AppColors.warning;
      case LoyaltyTier.silver:
        return AppColors.info;
      case LoyaltyTier.gold:
        return AppColors.warning;
      case LoyaltyTier.platinum:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final members = ref.watch(loyaltyListProvider);
    final selected = ref.watch(selectedMemberProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Loyalty')),
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
                    Text('Tambah Member',
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    FTextField(
                        control: FTextFieldControl.managed(controller: _nameCtrl),
                        label: const Text('Nama'),
                        hint: 'Nama member'),
                    const SizedBox(height: 12),
                    FTextField(
                        control: FTextFieldControl.managed(controller: _phoneCtrl),
                        label: const Text('HP (opsional)'),
                        hint: '08...',
                        keyboardType: TextInputType.phone),
                    const SizedBox(height: 12),
                    FButton(
                        onPress: _addMember, child: const Text('Tambah')).animate().scaleXY(begin: 0.98, end: 1, duration: 200.ms),
                  ],
                ),
              ),
            ).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
            const SizedBox(height: 16),
            if (selected != null) ...[
              FCard(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.stars, color: _tierColor(selected.tier)),
                          const SizedBox(width: 8),
                          Text(selected.name,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700)),
                          const Spacer(),
                          FBadge(
                            child: Text(selected.tier.label),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('Poin: ${selected.points}',
                          style: Theme.of(context).textTheme.titleLarge),
                      Text('Earn rate: ${selected.earnRate}/1000',
                          style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: FTextField(
                                control: FTextFieldControl.managed(controller: _earnCtrl),
                                label: const Text('Nominal belanja (Rp)'),
                                hint: '1000',
                                keyboardType: TextInputType.number),
                          ),
                          const SizedBox(width: 8),
                          FButton(
                            onPress: () async {
                              final amt = double.tryParse(_earnCtrl.text) ?? 0;
                              final pts = selected.earnPoints(amt);
                              await ref
                                  .read(loyaltyListProvider.notifier)
                                  .earnPoints(selected.id, pts);
                              final updated = ref
                                  .read(loyaltyListProvider)
                                  .maybeWhen(
                                      data: (l) => l.firstWhere(
                                          (e) => e.id == selected.id),
                                      orElse: () => null);
                              if (updated != null) {
                                ref
                                    .read(selectedMemberProvider.notifier)
                                    .state = updated;
                              }
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Earn +$pts poin')));
                            },
                            child: const Text('Earn'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: FTextField(
                                control: FTextFieldControl.managed(controller: _redeemCtrl),
                                label: const Text('Tukar poin'),
                                hint: '100',
                                keyboardType: TextInputType.number),
                          ),
                          const SizedBox(width: 8),
                          FButton(
                            variant: FButtonVariant.secondary,
                            onPress: () async {
                              final cost = int.tryParse(_redeemCtrl.text) ?? 0;
                              try {
                                await ref
                                    .read(loyaltyListProvider.notifier)
                                    .redeemPoints(selected.id, cost);
                                final updated = ref
                                    .read(loyaltyListProvider)
                                    .maybeWhen(
                                        data: (l) => l.firstWhere(
                                            (e) => e.id == selected.id),
                                        orElse: () => null);
                                if (updated != null) {
                                  ref
                                      .read(selectedMemberProvider.notifier)
                                      .state = updated;
                                }
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                        content: Text('Redeem -$cost poin')));
                              } catch (e) {
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(e.toString())));
                              }
                            },
                            child: const Text('Redeem'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ).animate().fade(duration: 200.ms).slideY(begin: 0.04, end: 0, duration: 220.ms),
              const SizedBox(height: 16),
            ],
            Text('Daftar Member',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            members.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Gagal: $e'),
              data: (list) {
                if (list.isEmpty) return const Text('Belum ada member');
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final m = list[i];
                    final isSel = selected?.id == m.id;
                    return FCard(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: ListTile(
                          leading: CircleAvatar(
                              backgroundColor: _tierColor(m.tier),
                              child: Text(m.tier.label[0],
                                  style: const TextStyle(color: Colors.white))),
                          title: Text(m.name),
                          subtitle: Text(
                              '${m.tier.label} • ${m.points} poin${m.phone != null ? ' • ${m.phone}' : ''}'),
                          trailing: FBadge(child: Text('${m.points}')),
                          onTap: () =>
                              ref.read(selectedMemberProvider.notifier).state = m,
                          selected: isSel,
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
