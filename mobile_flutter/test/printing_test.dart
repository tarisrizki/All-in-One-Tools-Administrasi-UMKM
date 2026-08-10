import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:beres_pos/features/printing/presentation/receipt_preview_screen.dart';
import 'package:beres_pos/shared/models/order.dart';
import 'package:beres_pos/shared/models/order_item.dart';
import 'package:beres_pos/shared/models/receipt_template.dart';
import 'package:beres_pos/shared/services/print_service.dart';

import 'test_helper.dart';

Order _demoOrder() => Order(
      id: 'ORD-TEST-1',
      outletId: 'outlet-1',
      type: OrderType.dineIn,
      status: OrderStatus.pending,
      queueNumber: 7,
      tableId: 'B2',
      createdAt: DateTime(2026, 8, 10, 10, 30),
      items: const [
        OrderItem(productId: 'p1', name: 'Ayam Bakar', qty: 1, price: 35000),
        OrderItem(productId: 'p2', name: 'Nasi Putih', qty: 2, price: 5000),
      ],
      serviceCharge: 3000,
    );

void main() {
  // Ensure flutter bindings for MethodChannel / Hive
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ReceiptTemplate', () {
    test('toJson/fromJson round-trip', () {
      const t = ReceiptTemplate(id: 't1', header: 'TOKO A', footer: 'Thanks', itemLayout: ReceiptItemLayout.detailed, showTax: true, showQueue: false);
      final j = t.toJson();
      final t2 = ReceiptTemplate.fromJson(j);
      expect(t2.id, 't1');
      expect(t2.header, 'TOKO A');
      expect(t2.itemLayout, ReceiptItemLayout.detailed);
      expect(t2.showTax, true);
      expect(t2.showQueue, false);
    });

    test('defaultTemplate has expected defaults', () {
      final d = ReceiptTemplate.defaultTemplate;
      expect(d.id, 'default');
      expect(d.showQueue, true);
      expect(d.showTax, false);
      expect(d.itemLayout, ReceiptItemLayout.compact);
    });

    test('copyWith', () {
      const t = ReceiptTemplate(id: 'x', header: 'H');
      final t2 = t.copyWith(header: 'H2', showTax: true);
      expect(t2.header, 'H2');
      expect(t2.showTax, true);
      expect(t2.id, 'x');
    });
  });

  group('PrintService preview', () {
    test('receiptPreviewText contains header, items, total', () {
      final svc = PrintService();
      final order = _demoOrder();
      const tmpl = ReceiptTemplate(id: 'default', header: 'MY TOKO', footer: 'Bye', showQueue: true, itemLayout: ReceiptItemLayout.compact);
      final txt = svc.receiptPreviewText(order, tmpl);
      expect(txt.contains('MY TOKO'), true);
      expect(txt.contains('Antrian #7'), true);
      expect(txt.contains('Ayam Bakar'), true);
      expect(txt.contains('TOTAL'), true);
      expect(txt.contains('Bye'), true);
    });

    test('kitchenPreviewText contains KITCHEN + qty', () {
      final svc = PrintService();
      final txt = svc.kitchenPreviewText(_demoOrder());
      expect(txt.contains('KITCHEN TICKET'), true);
      expect(txt.contains('1 x  Ayam Bakar'), true);
      expect(txt.contains('2 x  Nasi Putih'), true);
    });

    test('receiptPreviewText detailed layout shows qty x price', () {
      final svc = PrintService();
      final order = _demoOrder();
      const tmpl = ReceiptTemplate(id: 'd', header: 'H', footer: 'F', itemLayout: ReceiptItemLayout.detailed, showQueue: false);
      final txt = svc.receiptPreviewText(order, tmpl);
      expect(txt.contains('x Rp'), true);
    });

    test('getTemplates/saveTemplate round-trip (in-memory Hive)', () async {
      final tmp = await Directory.systemTemp.createTemp('hive_print_');
      Hive.init(tmp.path);
      final box = await Hive.openBox('receipt_templates_test');
      final svc = PrintService(box: box);
      await box.clear();
      final before = await svc.getTemplates();
      expect(before.length, 1); // default
      const custom = ReceiptTemplate(id: 'custom1', header: 'CUST', footer: 'F');
      await svc.saveTemplate(custom);
      final after = await svc.getTemplates();
      expect(after.any((e) => e.id == 'custom1'), true);
      await box.clear();
      await box.close();
      await Hive.deleteBoxFromDisk('receipt_templates_test');
      await Hive.close();
      if (tmp.existsSync()) tmp.deleteSync(recursive: true);
    });
  });

  group('ReceiptPreviewScreen widget', () {
    testWidgets('renders tabs and paper preview', (tester) async {
      await tester.pumpWidget(
        testableWidget(const ReceiptPreviewScreen()),
      );
      await tester.pumpAndSettle();
      expect(find.text('Preview Struk'), findsOneWidget);
      expect(find.text('Struk'), findsOneWidget);
      expect(find.text('Dapur'), findsOneWidget);
      expect(find.text('Editor'), findsOneWidget);
      expect(find.textContaining('BERES POS'), findsOneWidget);
    });

    testWidgets('editor tab shows switches and fields', (tester) async {
      await tester.pumpWidget(
        testableWidget(const ReceiptPreviewScreen()),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Editor'));
      await tester.pumpAndSettle();
      expect(find.text('Tampilkan Pajak/Service'), findsOneWidget);
      expect(find.text('Tampilkan Nomor Antrian'), findsOneWidget);
      expect(find.text('Simpan Template'), findsOneWidget);
    });

    testWidgets('copy + print buttons present', (tester) async {
      await tester.pumpWidget(
        testableWidget(const ReceiptPreviewScreen()),
      );
      await tester.pumpAndSettle();
      expect(find.text('Salin'), findsOneWidget);
      expect(find.text('Cetak Struk'), findsOneWidget);
    });
  });
}
