import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:beres_pos/shared/models/order.dart';
import 'package:beres_pos/shared/models/order_item.dart';
import 'package:beres_pos/shared/providers/order_provider.dart';
import 'package:beres_pos/shared/services/order_service.dart';

void main() {
  late Directory tmp;
  late Box queueBox;

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('hive_order_test_');
    Hive.init(tmp.path);
    queueBox = await Hive.openBox('queue');
  });

  tearDown(() async {
    await Hive.close();
    if (tmp.existsSync()) tmp.deleteSync(recursive: true);
  });

  group('Order model', () {
    test('total = subtotal + serviceCharge', () {
      final o = Order(
        id: '1',
        outletId: 'o1',
        type: OrderType.dineIn,
        status: OrderStatus.pending,
        items: const [OrderItem(productId: 'p1', name: 'Kopi', qty: 2, price: 10000)],
        serviceCharge: 2000,
        queueNumber: 1,
        createdAt: DateTime(2024, 1, 1),
      );
      expect(o.subtotal, 20000);
      expect(o.total, 22000);
      expect(o.type.apiValue, 'dine_in');
      expect(o.status.apiValue, 'pending');
      expect(OrderTypeX.fromApi('takeaway'), OrderType.takeaway);
      expect(OrderStatusX.fromApi('completed'), OrderStatus.completed);
      expect(o.toJson()['queueNumber'], 1);
    });

    test('OrderItem subtotal', () {
      const item = OrderItem(productId: 'p1', name: 'A', qty: 3, price: 5000);
      expect(item.subtotal, 15000);
      expect(item.toJson()['productId'], 'p1');
      expect(OrderItem.fromJson({'productId': 'p1', 'name': 'A', 'qty': 3, 'price': 5000}).qty, 3);
    });
  });

  group('OrderService queue fallback', () {
    test('nextQueueNumber falls back to Hive when Dio fails', () async {
      final dio = Dio(BaseOptions(baseUrl: 'http://127.0.0.1:9'));
      dio.interceptors.add(InterceptorsWrapper(onRequest: (o, h) => h.reject(DioException(requestOptions: o, error: 'offline'))));
      final svc = OrderService(dio, queueBox: queueBox);
      final n1 = await svc.nextQueueNumber();
      final n2 = await svc.nextQueueNumber();
      expect(n1, 1);
      expect(n2, 2);
    });

    test('createOrder offline fallback returns local order', () async {
      final dio = Dio(BaseOptions(baseUrl: 'http://127.0.0.1:9'));
      dio.interceptors.add(InterceptorsWrapper(onRequest: (o, h) => h.reject(DioException(requestOptions: o, error: 'offline'))));
      final svc = OrderService(dio, queueBox: queueBox);
      final order = await svc.createOrder(
        outletId: 'o1',
        type: OrderType.takeaway,
        items: const [OrderItem(productId: 'p1', name: 'Kopi', qty: 1, price: 10000)],
      );
      expect(order.id.startsWith('local_'), isTrue);
      expect(order.type, OrderType.takeaway);
      expect(order.queueNumber, greaterThan(0));
    });
  });

  test('OrderListNotifier create flow smoke', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://127.0.0.1:9'));
    dio.interceptors.add(InterceptorsWrapper(onRequest: (o, h) => h.reject(DioException(requestOptions: o, error: 'offline'))));
    final svc = OrderService(dio, queueBox: queueBox);

    final container = ProviderContainer(
      overrides: [orderServiceProvider.overrideWithValue(svc)],
    );
    addTearDown(container.dispose);

    await container.read(orderListProvider.notifier).create(
          outletId: 'test-outlet',
          type: OrderType.delivery,
          items: const [OrderItem(productId: 'p1', name: 'Es Kopi', qty: 1, price: 18000)],
          serviceCharge: 2000,
        );

    final listAsync = container.read(orderListProvider);
    final orders = listAsync.valueOrNull ?? const <Order>[];
    expect(orders.isNotEmpty, isTrue);
    expect(orders.first.outletId, 'test-outlet');
    expect(orders.first.type, OrderType.delivery);
    expect(orders.first.serviceCharge, 2000);
    expect(orders.first.queueNumber, greaterThan(0));
  });
}
