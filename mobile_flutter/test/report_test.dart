import 'package:beres_pos/features/reports/presentation/report_screen.dart';
import 'package:beres_pos/shared/models/auth_session.dart';
import 'package:beres_pos/shared/models/report.dart';
import 'package:beres_pos/shared/providers/report_provider.dart';
import 'package:beres_pos/shared/services/api_client.dart';
import 'package:beres_pos/shared/services/report_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'test_helper.dart';

ReportService _fakeService() {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.invalid'));
  dio.interceptors.add(InterceptorsWrapper(
      onRequest: (o, h) => h.reject(DioException(requestOptions: o, type: DioExceptionType.connectionTimeout))));
  return ReportService(dio);
}

const _allowed = AuthSession(
    token: 't', refreshToken: 'r', userId: 'u', businessId: 'b', businessName: 'Toko', appMode: 'simple', permissions: ['reports:read']);

Widget _wrap(Widget child, ReportService svc, {AuthSession session = _allowed}) => ProviderScope(
      overrides: [reportServiceProvider.overrideWithValue(svc), authSessionProvider.overrideWith((ref) => session)],
      child: testableWidget(child),
    );

void main() {
  testWidgets('ReportScreen smoke — renders key widgets', (tester) async {
    await tester.pumpWidget(_wrap(const ReportScreen(), _fakeService()));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('Laporan'), findsOneWidget);
    expect(find.byKey(const Key('periodDropdown')), findsOneWidget);
    expect(find.byKey(const Key('dateRangeButton')), findsOneWidget);
    expect(find.byKey(const Key('salesChartPlaceholder')), findsOneWidget);
    expect(find.byKey(const Key('stockTable')), findsOneWidget);
    expect(find.byKey(const Key('roleRestrictionBanner')), findsNothing);
    // ListView lazy-builds offscreen items — drag to reveal export button
    await tester.drag(find.byType(ListView), const Offset(0, -600));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('exportButton')), findsOneWidget);
  });

  testWidgets('ReportScreen export button does not crash', (tester) async {
    await tester.pumpWidget(_wrap(const ReportScreen(), _fakeService()));
    await tester.pump(const Duration(milliseconds: 800));
    await tester.drag(find.byType(ListView), const Offset(0, -600));
    await tester.pump(const Duration(milliseconds: 300));
    final btn = find.byKey(const Key('exportButton'));
    expect(btn, findsOneWidget);
    await tester.tap(btn);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Laporan'), findsOneWidget);
  });

  test('ReportPeriod queryParam + SalesReport round-trip', () {
    expect(ReportPeriod.daily.queryParam, 'daily');
    final r = SalesReport(date: DateTime(2026, 8, 1), totalSales: 1000, transactionCount: 5);
    final r2 = SalesReport.fromJson(r.toJson());
    expect(r2.totalSales, 1000);
    final st = StockTurnover(productId: 'p1', productName: 'Kopi', soldQty: 10, stockRemaining: 5, turnoverRate: 0.66);
    expect(StockTurnover.fromJson(st.toJson()).productName, 'Kopi');
  });

  testWidgets('ReportScreen blocked when role tanpa izin laporan', (tester) async {
    const denied =
        AuthSession(token: 't', refreshToken: 'r', userId: 'u', businessId: 'b', businessName: 'Toko', appMode: 'simple', permissions: []);
    await tester.pumpWidget(_wrap(const ReportScreen(), _fakeService(), session: denied));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Akses ditolak'), findsOneWidget);
    expect(find.text('Role Anda tidak memiliki izin reports:read.'), findsOneWidget);
    expect(find.byKey(const Key('periodDropdown')), findsNothing);
  });

  testWidgets('ReportScreen allow when role dengan reports:read', (tester) async {
    await tester.pumpWidget(_wrap(const ReportScreen(), _fakeService()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Akses ditolak'), findsNothing);
    expect(find.byKey(const Key('periodDropdown')), findsOneWidget);
  });
}
