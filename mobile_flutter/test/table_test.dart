import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:beres_pos/shared/models/table.dart';
import 'package:beres_pos/features/tables/presentation/table_screen.dart';
import 'package:beres_pos/shared/providers/table_provider.dart';

import 'test_helper.dart';

void main() {
  test('DiningTable fromJson/toJson round-trip', () {
    const t = DiningTable(id: 't1', outletId: 'o1', number: '05', capacity: 4, area: 'Indoor', status: TableStatus.occupied, currentOrderId: 'ord123');
    final j = t.toJson();
    final r = DiningTable.fromJson(j);
    expect(r.id, 't1');
    expect(r.number, '05');
    expect(r.status, TableStatus.occupied);
    expect(r.currentOrderId, 'ord123');
  });

  test('TableStatus label', () {
    expect(TableStatus.empty.label, 'Kosong');
    expect(TableStatus.occupied.label, 'Terisi');
    expect(TableStatus.reserved.label, 'Dipesan');
  });

  testWidgets('TableScreen shows grid + add meja', (tester) async {
    final tables = [
      const DiningTable(id: 't1', outletId: 'o1', number: '01', capacity: 2, area: 'Indoor', status: TableStatus.empty),
      const DiningTable(id: 't2', outletId: 'o1', number: '02', capacity: 4, area: 'Outdoor', status: TableStatus.occupied, currentOrderId: 'ord1'),
    ];
    await tester.pumpWidget(ProviderScope(
      overrides: [tableListProvider.overrideWith((ref, arg) async => tables)],
      child: testableWidget(const TableScreen(outletId: 'o1')),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.textContaining('Meja 01'), findsOneWidget);
    expect(find.textContaining('Meja 02'), findsOneWidget);
    expect(find.text('Terisi'), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsOneWidget);
  });

  testWidgets('TableScreen empty state', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [tableListProvider.overrideWith((ref, arg) async => <DiningTable>[])],
      child: testableWidget(const TableScreen(outletId: 'o1')),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Belum ada meja'), findsOneWidget);
  });

  testWidgets('Table CRUD dialog opens', (tester) async {
    final tables = [const DiningTable(id: 't1', outletId: 'o1', number: '01', capacity: 2, area: 'Indoor')];
    await tester.pumpWidget(ProviderScope(
      overrides: [tableListProvider.overrideWith((ref, arg) async => tables)],
      child: testableWidget(const TableScreen(outletId: 'o1')),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.textContaining('Meja 01'));
    await tester.pumpAndSettle();
    expect(find.text('Edit Meja'), findsOneWidget);
    expect(find.text('Simpan'), findsOneWidget);
  });
}
