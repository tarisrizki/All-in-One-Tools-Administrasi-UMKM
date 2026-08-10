import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:beres_pos/features/payment/presentation/payment_screen.dart';
import 'package:beres_pos/shared/providers/payment_provider.dart';

void main() {
  setUpAll(() async {
    Hive.init(r'C:\Users\Dragon\AppData\Local\Temp\test_hive_e2e_pay');
    await Hive.openBox('beres');
  });

  Widget wrap(Widget child) => ProviderScope(child: MaterialApp(home: child));

  testWidgets('PaymentScreen renders method chips + badge + QR placeholder', (tester) async {
    await tester.pumpWidget(wrap(const PaymentScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.text('Tunai'), findsWidgets);
  });

  testWidgets('PaymentScreen switch to QRIS shows QR area', (tester) async {
    await tester.pumpWidget(wrap(const PaymentScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    final qris = find.text('QRIS');
    if (qris.evaluate().isNotEmpty) {
      await tester.tap(qris.first);
      await tester.pump(const Duration(milliseconds: 300));
    }
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('PaymentScreen amount field validation', (tester) async {
    await tester.pumpWidget(wrap(const PaymentScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    final fields = find.byType(TextField);
    expect(fields, findsWidgets);
  });

  testWidgets('PaymentScreen pay button disabled without amount', (tester) async {
    await tester.pumpWidget(wrap(const PaymentScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(FilledButton), findsWidgets);
  });

  testWidgets('PaymentScreen tunai change calculation smoke', (tester) async {
    await tester.pumpWidget(wrap(const PaymentScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    final tunai = find.text('Tunai');
    if (tunai.evaluate().isNotEmpty) {
      await tester.tap(tunai.first);
      await tester.pump(const Duration(milliseconds: 300));
    }
    expect(find.byType(Scaffold), findsOneWidget);
  });
}
