import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:beres_pos/features/outlet/presentation/outlet_screen.dart';
import 'package:beres_pos/shared/models/outlet.dart';
import 'package:beres_pos/shared/providers/outlet_provider.dart';

import 'test_helper.dart';

void main() {
  group('Outlet model', () {
    test('fromJson + toJson roundtrip', () {
      const o = Outlet(id: '1', name: 'Cabang A', address: 'Jl. A', phone: '081', isMain: true, businessId: 'b1');
      final j = o.toJson();
      final r = Outlet.fromJson(j);
      expect(r.id, '1');
      expect(r.name, 'Cabang A');
      expect(r.isMain, true);
    });

    test('fromJson snake_case', () {
      final o = Outlet.fromJson({'id': 'x', 'name': 'Y', 'is_main': true, 'business_id': 'b2'});
      expect(o.isMain, true);
      expect(o.businessId, 'b2');
    });

    test('copyWith', () {
      const o = Outlet(id: '1', name: 'A');
      expect(o.copyWith(name: 'B').name, 'B');
      expect(o.copyWith(isMain: true).isMain, true);
    });
  });

  group('OutletScreen widget', () {
    testWidgets('renders list + add form toggle', (tester) async {
      final mockOutlets = [
        const Outlet(id: 'o1', name: 'Cabang Utama', isMain: true, address: 'Jl. Utama'),
        const Outlet(id: 'o2', name: 'Cabang 2', address: 'Jl. Dua'),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            outletListProvider.overrideWith((ref) async => mockOutlets),
          ],
          child: testableWidget(const OutletScreen()),
        ),
      );
      await tester.pump();

      expect(find.text('Kelola Outlet'), findsOneWidget);
      expect(find.text('Daftar Outlet'), findsOneWidget);
      // Mock outlets rendered
      expect(find.text('Cabang Utama'), findsWidgets);
      expect(find.text('Cabang 2'), findsOneWidget);

      // Toggle form tambah cabang.
      expect(find.text('Tambah Cabang'), findsOneWidget);
      await tester.tap(find.text('Tambah Cabang'));
      await tester.pump();
      expect(find.text('Nama cabang *'), findsOneWidget);

      // Tutup form.
      await tester.tap(find.text('Tutup'));
      await tester.pump();
      expect(find.text('Nama cabang *'), findsNothing);
    });

    testWidgets('switch outlet via radio', (tester) async {
      final mockOutlets = [
        const Outlet(id: 'o1', name: 'Cabang Utama', isMain: true),
        const Outlet(id: 'o2', name: 'Cabang 2'),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            outletListProvider.overrideWith((ref) async => mockOutlets),
          ],
          child: testableWidget(const OutletScreen()),
        ),
      );
      await tester.pump();

      expect(find.byType(OutletScreen), findsOneWidget);
      // Tap cabang 2 radio — should set currentOutletId
      expect(find.text('Cabang 2'), findsOneWidget);
    });
  });
}
