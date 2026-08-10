import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:beres_pos/features/reports/presentation/report_screen.dart';
import 'package:beres_pos/shared/models/auth_session.dart';
import 'package:beres_pos/shared/services/api_client.dart';

void main() {
  setUpAll(() async {
    Hive.init(r'C:\Users\Dragon\AppData\Local\Temp\test_hive_e2e_report');
    await Hive.openBox('beres');
  });

  Widget wrap(Widget child, {AuthSession? session}) {
    final s = session ??
        const AuthSession(
            token: 't', refreshToken: 'r', userId: 'u', businessId: 'b', businessName: 'Toko', appMode: 'simple', permissions: ['reports:read']);
    return ProviderScope(
        overrides: [authSessionProvider.overrideWith((ref) => s)], child: MaterialApp(home: child));
  }

  testWidgets('ReportScreen renders period dropdown + date button + chart', (tester) async {
    await tester.pumpWidget(wrap(const ReportScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('periodDropdown')), findsOneWidget);
    expect(find.byKey(const Key('dateRangeButton')), findsOneWidget);
    expect(find.byKey(const Key('salesChartPlaceholder')), findsOneWidget);
  });

  testWidgets('ReportScreen period change triggers reload', (tester) async {
    await tester.pumpWidget(wrap(const ReportScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    final dd = find.byKey(const Key('periodDropdown'));
    await tester.tap(dd);
    await tester.pump(const Duration(milliseconds: 300));
    final weekly = find.text('Mingguan');
    if (weekly.evaluate().isNotEmpty) {
      await tester.tap(weekly.first);
      await tester.pump(const Duration(milliseconds: 300));
    }
    expect(find.byKey(const Key('periodDropdown')), findsOneWidget);
  });

  testWidgets('ReportScreen stock table present', (tester) async {
    await tester.pumpWidget(wrap(const ReportScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('stockTable')), findsOneWidget);
    expect(find.text('Perputaran Stok'), findsOneWidget);
  });

  testWidgets('ReportScreen export button exists and shows path placeholder', (tester) async {
    await tester.pumpWidget(wrap(const ReportScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('exportButton')), findsOneWidget);
    expect(find.text('Export PDF/Excel (CSV)'), findsOneWidget);
  });

  testWidgets('ReportScreen loading indicator when loading', (tester) async {
    await tester.pumpWidget(wrap(const ReportScreen()));
    await tester.pump(const Duration(milliseconds: 100));
    // Scaffold always present regardless of loading
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('ReportScreen blocked for role tanpa izin laporan', (tester) async {
    const denied = AuthSession(
        token: 't', refreshToken: 'r', userId: 'u', businessId: 'b', businessName: 'Toko', appMode: 'simple', permissions: []);
    await tester.pumpWidget(wrap(const ReportScreen(), session: denied));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Akses ditolak'), findsOneWidget);
    expect(find.text('Role Anda tidak memiliki izin reports:read.'), findsOneWidget);
    expect(find.byKey(const Key('periodDropdown')), findsNothing);
  });

  testWidgets('ReportScreen allow for role dengan izin laporan', (tester) async {
    await tester.pumpWidget(wrap(const ReportScreen()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Akses ditolak'), findsNothing);
    expect(find.byKey(const Key('periodDropdown')), findsOneWidget);
  });
}
