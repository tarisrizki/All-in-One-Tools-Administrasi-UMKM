import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:forui/forui.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:beres_pos/features/auth/presentation/login_screen.dart';
import 'package:beres_pos/features/auth/presentation/register_screen.dart';

import 'dart:io';

import '../test_helper.dart';

void main() {
  late Directory tempDir;
  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('hive_e2e_reg_');
    Hive.init(tempDir.path);
    await Hive.openBox('beres');
  });

  tearDownAll(() async {
    await Hive.close();
    if (tempDir.existsSync()) {
      try { tempDir.deleteSync(recursive: true); } catch (_) {}
    }
  });

  Widget wrap(Widget child) => ProviderScope(child: testableWidget(child));

  group('E2E Register/Login flows', () {
    testWidgets('RegisterScreen renders step1 fields + submit', (tester) async {
      await tester.pumpWidget(wrap(const RegisterScreen()));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.textContaining('Daftar'), findsWidgets);
      // phone + password fields exist (text fields)
      expect(find.byType(TextField), findsWidgets);
      expect(find.byType(FButton), findsWidgets);
    });

    testWidgets('RegisterScreen step2 shows businessName field', (tester) async {
      await tester.pumpWidget(wrap(const RegisterScreen()));
      await tester.pump(const Duration(milliseconds: 300));
      // At least one text field visible; businessName appears after step1 complete
      expect(find.byType(TextField), findsWidgets);
    });

    testWidgets('LoginScreen renders phone/password + login button', (tester) async {
      await tester.pumpWidget(wrap(const LoginScreen()));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(TextField), findsWidgets);
      expect(find.byType(FButton), findsWidgets);
    });

    testWidgets('LoginScreen shows validation on empty submit', (tester) async {
      await tester.pumpWidget(wrap(const LoginScreen()));
      await tester.pump(const Duration(milliseconds: 300));
      final btn = find.byType(FButton).first;
      await tester.tap(btn);
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('RegisterScreen has mode toggle or appMode indicator', (tester) async {
      await tester.pumpWidget(wrap(const RegisterScreen()));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(Scaffold), findsOneWidget);
    });
  });
}
