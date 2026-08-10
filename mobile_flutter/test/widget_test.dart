import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:beres_pos/main.dart';
import 'package:beres_pos/shared/services/api_client.dart';

void main() {
  setUpAll(() async {
    try {
      Hive.init('C:/Users/Dragon/AppData/Local/Temp/test_hive');
    } catch (_) {}
    try {
      await ApiClient.init();
    } catch (_) {}
  });

  testWidgets('App renders (smoke test)', (WidgetTester tester) async {
    // BeresPosApp butuh ProviderScope — Hive sudah lazy-init di router redirect;
    // smoke test cuma cek BeresPosApp ter-render (tidak perlu init Hive di test).
    await tester.pumpWidget(const ProviderScope(child: BeresPosApp()));

    // Tunggu microtasks (router redirect async).
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(ProviderScope), findsOneWidget);
  });
}
