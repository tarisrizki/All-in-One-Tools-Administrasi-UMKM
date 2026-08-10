import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:beres_pos/shared/models/product.dart';
import 'package:beres_pos/shared/models/category.dart';
import 'package:beres_pos/shared/models/variant.dart';
import 'package:beres_pos/shared/models/raw_material.dart';
import 'package:beres_pos/shared/services/product_service.dart';
import 'package:beres_pos/shared/providers/product_provider.dart';
import 'package:beres_pos/features/products/presentation/product_list_screen.dart';

import 'test_helper.dart';

void main() {
  group('models', () {
    test('Product fromJson/toJson roundtrip', () {
      const p = Product(id: 'p1', name: 'Kopi', sku: 'KOP-1', categoryId: 'c1', price: 10000, costPrice: 5000, stock: 10);
      final j = p.toJson();
      final r = Product.fromJson(j);
      expect(r.id, 'p1'); expect(r.sku, 'KOP-1'); expect(r.price, 10000); expect(r.stock, 10);
    });
    test('Category/Variant/RawMaterial/Recipe json', () {
      final c = Category.fromJson({'id': 'c1', 'name': 'Minuman'});
      expect(c.name, 'Minuman');
      final v = Variant.fromJson({'id': 'v1', 'productId': 'p1', 'name': 'Large', 'priceDelta': 3000});
      expect(v.priceDelta, 3000);
      final m = RawMaterial.fromJson({'id': 'm1', 'name': 'Susu', 'unit': 'ml', 'stock': 5000});
      expect(m.unit, 'ml');
      final rec = Recipe.fromJson({'productId': 'p1', 'rawMaterialId': 'm1', 'quantity': 150});
      expect(rec.quantity, 150);
    });
    test('ProductService exportCsv fallback tanpa ApiClient', () async {
      ProductService.instance.resetMock();
      final csv = await ProductService.instance.exportCsv();
      expect(csv, contains('Kopi Susu'));
      expect(csv, contains('id,name,sku'));
    });
  });

  testWidgets('ProductListScreen smoke — renders ListView + search', (tester) async {
    const mockProducts = [
      Product(id: 'p1', name: 'Kopi Susu', sku: 'KOP-001', categoryId: 'c1', price: 18000, costPrice: 8000, stock: 42),
      Product(id: 'p2', name: 'Croissant', sku: 'CRS-001', categoryId: 'c2', price: 15000, costPrice: 7000, stock: 12),
    ];
    const mockCats = [Category(id: 'c1', name: 'Minuman'), Category(id: 'c2', name: 'Makanan')];
    await tester.pumpWidget(ProviderScope(
      overrides: [
        productListProvider.overrideWith((ref) async => mockProducts),
        categoryProvider.overrideWith((ref) async => mockCats),
      ],
      child: testableWidget(const ProductListScreen()),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Produk'), findsOneWidget);
    expect(find.byType(ListView), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Kopi Susu'), findsOneWidget);
    // search filter
    await tester.enterText(find.byType(TextField), 'croissant');
    await tester.pumpAndSettle();
    expect(find.text('Croissant'), findsOneWidget);
    expect(find.text('Kopi Susu'), findsNothing);
  });
}
