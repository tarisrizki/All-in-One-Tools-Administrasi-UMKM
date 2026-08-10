import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
            Card(
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
                    TextField(
                        controller: _nameCtrl,
                        decoration: const InputDecoration(labelText: 'Nama')),
                    const SizedBox(height: 12),
                    TextField(
                        controller: _phoneCtrl,
                        decoration:
                            const InputDecoration(labelText: 'HP (opsional)'),
                        keyboardType: TextInputType.phone),
                    const SizedBox(height: 12),
                    FilledButton(
                        onPressed: _addMember, child: const Text('Tambah')),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (selected != null) ...[
              Card(
                color: _tierColor(selected.tier).withValues(alpha: 0.12),
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
                          Chip(
                            label: Text(selected.tier.label),
                            backgroundColor: _tierColor(selected.tier)
                                .withValues(alpha: 0.2),
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
                            child: TextField(
                                controller: _earnCtrl,
                                decoration: const InputDecoration(
                                    labelText: 'Nominal belanja (Rp)'),
                                keyboardType: TextInputType.number),
                          ),
                          const SizedBox(width: 8),
                          FilledButton(
                            onPressed: () async {
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
                              if (updated != null)
                                ref
                                    .read(selectedMemberProvider.notifier)
                                    .state = updated;
                              if (!mounted) return;
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
                            child: TextField(
                                controller: _redeemCtrl,
                                decoration: const InputDecoration(
                                    labelText: 'Tukar poin'),
                                keyboardType: TextInputType.number),
                          ),
                          const SizedBox(width: 8),
                          FilledButton.tonal(
                            onPressed: () async {
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
                                if (updated != null)
                                  ref
                                      .read(selectedMemberProvider.notifier)
                                      .state = updated;
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                        content: Text('Redeem -$cost poin')));
                              } catch (e) {
                                if (!mounted) return;
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
              ),
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
                    return Card(
                      color: isSel
                          ? Theme.of(context).colorScheme.primaryContainer
                          : null,
                      child: ListTile(
                        leading: CircleAvatar(
                            backgroundColor: _tierColor(m.tier),
                            child: Text(m.tier.label[0],
                                style: const TextStyle(color: Colors.white))),
                        title: Text(m.name),
                        subtitle: Text(
                            '${m.tier.label} • ${m.points} poin${m.phone != null ? ' • ${m.phone}' : ''}'),
                        trailing: Text('${m.points}',
                            style:
                                const TextStyle(fontWeight: FontWeight.w700)),
                        onTap: () =>
                            ref.read(selectedMemberProvider.notifier).state = m,
                      ),
                    );
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
