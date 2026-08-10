import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'dart:io';
import 'package:beres_pos/shared/models/discount.dart';
import 'package:beres_pos/shared/models/loyalty.dart';
import 'package:beres_pos/shared/providers/discount_provider.dart';
import 'package:beres_pos/shared/providers/loyalty_provider.dart';
import 'package:beres_pos/shared/services/discount_service.dart';
import 'package:beres_pos/shared/services/loyalty_service.dart';
import 'package:beres_pos/features/promo/presentation/discount_screen.dart';
import 'package:beres_pos/features/promo/presentation/loyalty_screen.dart';

import 'test_helper.dart';

class FakeDiscountService extends DiscountService {
  @override
  Future<List<Discount>> fetchAll() async => [];
  @override
  Future<Discount> create(Discount d) async => d;
  @override
  Future<Discount> update(Discount d) async => d;
  @override
  Future<void> delete(String id) async {}
  @override
  Future<Discount?> validateCode(String code, double subtotal) async => null;
}

class FakeLoyaltyService extends LoyaltyService {
  @override
  Future<List<LoyaltyMember>> fetchAll() async => [];
  @override
  Future<LoyaltyMember> create(LoyaltyMember m) async => m;
  @override
  Future<LoyaltyMember> earn(String memberId, int points) async => LoyaltyMember(id: memberId, name: 'X', points: points);
  @override
  Future<LoyaltyMember> redeem(String memberId, int cost) async => LoyaltyMember(id: memberId, name: 'X', points: 0);
}

void main() {
  late Directory tmp;
  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('hive_strategy_');
    Hive.init(tmp.path);
  });
  tearDown(() async {
    await Hive.close();
    if (tmp.existsSync()) tmp.deleteSync(recursive: true);
  });

  group('Discount model', () {
    test('isApplicable promoCode', () {
      const d = Discount(id: '1', type: DiscountType.promoCode, value: 10, code: 'HEMAT10', minPurchase: 50000);
      expect(d.isApplicable(subtotal: 40000, inputCode: 'HEMAT10'), isFalse);
      expect(d.isApplicable(subtotal: 60000, inputCode: 'hemat10'), isTrue);
      expect(d.isApplicable(subtotal: 60000, inputCode: 'WRONG'), isFalse);
    });
    test('calculate percent vs fixed', () {
      const pct = Discount(id: '1', type: DiscountType.perTransaction, value: 10);
      expect(pct.calculate(100000), 10000);
      const fixed = Discount(id: '2', type: DiscountType.perTransaction, value: 5000);
      expect(fixed.calculate(100000), 5000);
    });
    test('fromJson', () {
      final d = Discount.fromJson({'id': 'x', 'type': 'promo_code', 'value': 20, 'code': 'A', 'minPurchase': 1000});
      expect(d.type, DiscountType.promoCode);
      expect(d.code, 'A');
    });
  });

  group('LoyaltyMember', () {
    test('earnPoints & tier progression', () {
      const m = LoyaltyMember(id: '1', name: 'Budi', points: 900, earnRate: 1);
      expect(m.computedTier, LoyaltyTier.bronze);
      final after = m.addPoints(200);
      expect(after.points, 1100);
      expect(after.tier, LoyaltyTier.silver);
      expect(m.earnPoints(5000), 5);
    });
    test('redeem', () {
      const m = LoyaltyMember(id: '1', name: 'Siti', points: 500);
      final r = m.redeem(100);
      expect(r.points, 400);
      expect(() => m.redeem(1000), throwsArgumentError);
    });
    test('fromJson', () {
      final m = LoyaltyMember.fromJson({'id': 'x', 'name': 'A', 'points': 1500, 'tier': 'silver'});
      expect(m.tier, LoyaltyTier.silver);
      expect(m.points, 1500);
    });
  });

  group('Widget smoke', () {
    testWidgets('DiscountScreen renders form + list', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discountServiceProvider.overrideWithValue(FakeDiscountService()),
            loyaltyServiceProvider.overrideWithValue(FakeLoyaltyService()),
          ],
          child: testableWidget(const DiscountScreen()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Diskon & Promo'), findsOneWidget);
      expect(find.text('Kode Promo'), findsOneWidget);
      expect(find.text('Buat Diskon'), findsOneWidget);
      expect(find.text('Simpan Diskon'), findsOneWidget);
    });

    testWidgets('LoyaltyScreen renders', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            loyaltyServiceProvider.overrideWithValue(FakeLoyaltyService()),
            discountServiceProvider.overrideWithValue(FakeDiscountService()),
          ],
          child: testableWidget(const LoyaltyScreen()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Loyalty'), findsOneWidget);
      expect(find.text('Tambah Member'), findsOneWidget);
      expect(find.text('Daftar Member'), findsOneWidget);
    });

    testWidgets('DiscountScreen validate promo flow', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            discountServiceProvider.overrideWithValue(FakeDiscountService()),
          ],
          child: testableWidget(const DiscountScreen()),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, 'HEMAT10');
      await tester.tap(find.text('Validasi'));
      await tester.pumpAndSettle();
      expect(find.text('Diskon & Promo'), findsOneWidget);
    });
  });
}

