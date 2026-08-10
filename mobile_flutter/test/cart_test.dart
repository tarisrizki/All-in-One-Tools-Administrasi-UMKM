import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:beres_pos/src/features/cart/cart_notifier.dart';

void main() {
  late Directory tmp;
  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('hive_test_');
    Hive.init(tmp.path);
  });
  tearDown(() async {
    await Hive.close();
    if (tmp.existsSync()) tmp.deleteSync(recursive: true);
  });
  group('CartNotifier', () {
    test('add + total', () async {
      final box = await Hive.openBox('test_cart_a');
      final n = CartNotifier(box);
      n.add(const CartItem(productId: 'p1', name: 'Keripik', qty: 2, price: 10000));
      expect(n.state.length, 1);
      expect(n.total, 20000);
      n.add(const CartItem(productId: 'p1', name: 'Keripik', qty: 1, price: 10000));
      expect(n.state.first.qty, 3);
      await box.close();
    });
    test('remove + clear', () async {
      final box = await Hive.openBox('test_cart_b');
      final n = CartNotifier(box);
      n.add(const CartItem(productId: 'p1', name: 'A', qty: 1, price: 5000));
      n.remove('p1');
      expect(n.state, isEmpty);
      n.add(const CartItem(productId: 'p2', name: 'B', qty: 1, price: 7000));
      n.clear();
      expect(n.state, isEmpty);
      await box.close();
    });
  });
}
