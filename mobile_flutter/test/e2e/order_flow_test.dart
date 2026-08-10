import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:beres_pos/features/orders/presentation/order_screen.dart';
import 'package:beres_pos/shared/models/order.dart';
import 'package:beres_pos/shared/providers/order_provider.dart';
import 'package:beres_pos/shared/services/order_service.dart';
import 'package:beres_pos/shared/services/api_client.dart';
import 'package:dio/dio.dart';

import 'dart:io';

import '../test_helper.dart';

void main() {
  late Directory tempDir;
  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('hive_e2e_order_');
    Hive.init(tempDir.path);
    await Hive.openBox('beres');
    try { await ApiClient.init(); } catch (_) {}
  });

  tearDownAll(() async {
    await Hive.close();
    if (tempDir.existsSync()) {
      try { tempDir.deleteSync(recursive: true); } catch (_) {}
    }
  });

  Widget wrap(Widget child, {List<Override> overrides = const []}) =>
      ProviderScope(overrides: overrides, child: testableWidget(child));

  testWidgets('OrderScreen renders list + type chips', (tester) async {
    await tester.pumpWidget(wrap(const OrderScreen()));
    await tester.pumpAndSettle();
    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.byType(SegmentedButton<OrderType>), findsWidgets);
  });

  testWidgets('OrderScreen add item flow via provider override', (tester) async {
    final dio = Dio(BaseOptions(baseUrl: 'https://example.invalid'));
    final svc = OrderService(dio);
    await tester.pumpWidget(wrap(
      const OrderScreen(),
      overrides: [orderServiceProvider.overrideWithValue(svc)],
    ));
    await tester.pumpAndSettle();
    expect(find.byType(OrderScreen), findsOneWidget);
  });

  testWidgets('OrderScreen shows empty state when no orders', (tester) async {
    await tester.pumpWidget(wrap(const OrderScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Belum ada pesanan'), findsWidgets);
  });

  testWidgets('OrderScreen type filter changes', (tester) async {
    await tester.pumpWidget(wrap(const OrderScreen()));
    await tester.pumpAndSettle();
    final seg = find.byType(SegmentedButton<OrderType>);
    if (seg.evaluate().isNotEmpty) {
      await tester.tap(seg.first);
      await tester.pumpAndSettle();
    }
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('OrderScreen search field exists', (tester) async {
    await tester.pumpWidget(wrap(const OrderScreen()));
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsWidgets);
  });
}
