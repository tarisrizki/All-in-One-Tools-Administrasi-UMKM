import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:beres_pos/features/payment/presentation/payment_screen.dart';
import 'package:beres_pos/shared/models/payment.dart';

import 'test_helper.dart';

void main() {
  final d = DateTime(2030, 1, 15);
  test('Payment model json round-trip', () {
    final p = Payment(
      id: 'p1',
      orderId: 'o1',
      method: PaymentMethod.kasbon,
      amount: 100000,
      installments: [
        Installment(amount: 50000, dueDate: d, paid: false),
        Installment(amount: 50000, dueDate: d, paid: false),
      ],
      dpAmount: 20000,
    );
    final j = p.toJson();
    final r = Payment.fromJson(j);
    expect(r.id, 'p1');
    expect(r.method, PaymentMethod.kasbon);
    expect(r.installments.length, 2);
    expect(r.dpAmount, 20000);
  });

  testWidgets('PaymentScreen smoke — method chips + badge + QR placeholder',
      (tester) async {
    await tester.pumpWidget(
        ProviderScope(child: testableWidget(const PaymentScreen())));
    await tester.pumpAndSettle();

    // badge default (Tunai)
    expect(find.text('TUNAI'), findsOneWidget);

    // pilih metode labels
    expect(find.text('Tunai'), findsOneWidget);
    expect(find.text('QRIS'), findsOneWidget);
    expect(find.text('Kasbon'), findsOneWidget);
    expect(find.text('DP'), findsOneWidget);

    // hub bayar
    expect(find.text('Bayar'), findsOneWidget);

    // switch to QRIS — QR placeholder icon
    await tester.tap(find.text('QRIS'));
    await tester.pumpAndSettle();
    expect(find.text('QRIS'), findsWidgets);
    expect(find.byIcon(Icons.qr_code_2), findsOneWidget);
    expect(find.text('TUNAI'), findsNothing);
    expect(find.textContaining('QRIS'), findsWidgets);

    // switch to Kasbon — cicilan table placeholder text
    await tester.tap(find.text('Kasbon'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Cicilan'), findsOneWidget);

    // switch to DP — DP form
    await tester.tap(find.text('DP'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Uang Muka'), findsOneWidget);
    expect(find.text('Nominal DP'), findsOneWidget);
  });
}
