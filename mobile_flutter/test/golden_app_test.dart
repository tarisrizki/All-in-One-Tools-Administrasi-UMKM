import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:beres_pos/main.dart';
import 'package:golden_toolkit/golden_toolkit.dart';
import 'package:beres_pos/shared/services/api_client.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() {
  setUpAll(() async {
    await loadAppFonts();
    try {
      Hive.init('C:/Users/Dragon/AppData/Local/Temp/test_hive');
    } catch (_) {}
    try {
      await ApiClient.init();
    } catch (_) {}
  });

  for (final size in [const Size(360, 740), const Size(768, 1024), const Size(1280, 720)]) {
    testWidgets('golden ${size.width.toInt()}x${size.height.toInt()}', (t) async {
      t.view.physicalSize = size;
      t.view.devicePixelRatio = 1.0;
      addTearDown(t.view.resetPhysicalSize);
      await t.pumpWidget(const ProviderScope(child: BeresPosApp()));
      await t.pump(const Duration(milliseconds: 300));
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/app_${size.width.toInt()}x${size.height.toInt()}.png'));
    });
  }
}
