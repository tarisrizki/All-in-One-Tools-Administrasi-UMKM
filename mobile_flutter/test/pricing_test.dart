import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:beres_pos/features/pricing/presentation/pricing_screen.dart';
import 'package:beres_pos/shared/models/pricing.dart';
import 'package:beres_pos/shared/providers/pricing_provider.dart';
import 'package:beres_pos/shared/services/pricing_service.dart';

import 'test_helper.dart';

class _FakePricingService extends PricingService {
  final PricingConfig seeded;
  _FakePricingService(this.seeded);

  @override
  Future<PricingConfig> fetch(String productId) async => seeded;

  @override
  Future<PricingConfig> save(PricingConfig config) async => config;
}

void main() {
  late Directory tmp;

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('hive_pricing_');
    Hive.init(tmp.path);
  });

  tearDown(() async {
    await Hive.close();
    if (tmp.existsSync()) tmp.deleteSync(recursive: true);
  });

  group('Pricing model', () {
    test('json round-trip', () {
      const c = PricingConfig(
        productId: 'p1',
        costPrice: 15000,
        wholesaleTiers: [WholesaleTier(qty: 10, harga: 12000)],
        taxRate: 0.11,
      );
      final j = c.toJson();
      final r = PricingConfig.fromJson(j);
      expect(r.productId, 'p1');
      expect(r.costPrice, 15000);
      expect(r.wholesaleTiers.length, 1);
      expect(r.taxRate, 0.11);
      expect(r.priceWithTax(10000), closeTo(11100, 0.01));
    });

    test('expiry flags', () {
      final expired = PricingConfig(productId: 'p1', costPrice: 0, expiryDate: DateTime.now().subtract(const Duration(days: 1)));
      expect(expired.isExpired, true);
      final soon = PricingConfig(productId: 'p1', costPrice: 0, expiryDate: DateTime.now().add(const Duration(days: 3)));
      expect(soon.isExpiringSoon, true);
    });
  });

  testWidgets('PricingScreen smoke — form + tier table + slider + date + notice', (tester) async {
    const seeded = PricingConfig(productId: 'p-smoke', costPrice: 10000, taxRate: 0.11);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          pricingServiceProvider.overrideWithValue(_FakePricingService(seeded)),
        ],
        child: testableWidget(const PricingScreen(productId: 'p-smoke')),
      ),
    );
    // let provider load (microtask)
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Harga & Biaya'), findsOneWidget);
    expect(find.text('Harga Modal'), findsOneWidget);
    expect(find.text('Harga Grosir'), findsOneWidget);
    expect(find.text('Pajak'), findsOneWidget);
    expect(find.text('Kadaluarsa'), findsOneWidget);
    expect(find.byType(Slider), findsOneWidget);
    expect(find.text('Simpan Harga'), findsOneWidget);

    // tier add smoke
    await tester.enterText(find.widgetWithText(TextField, 'Qty').first, '10');
    await tester.enterText(find.widgetWithText(TextField, 'Harga').first, '9000');
    await tester.tap(find.text('Tambah'));
    await tester.pump();
    expect(find.text('10'), findsWidgets);
  });
}
