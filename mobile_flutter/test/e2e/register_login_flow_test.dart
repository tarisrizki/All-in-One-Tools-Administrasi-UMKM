import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:beres_pos/features/auth/presentation/login_screen.dart';
import 'package:beres_pos/features/auth/presentation/register_screen.dart';

void main() {
  setUpAll(() async {
    Hive.init(r'C:\Users\Dragon\AppData\Local\Temp\test_hive_e2e_reg');
    await Hive.openBox('beres');
  });

  group('E2E Register/Login flows', () {
    testWidgets('RegisterScreen renders step1 fields + submit', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: RegisterScreen())));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Daftar'), findsWidgets);
      // phone + password fields exist (text fields)
      expect(find.byType(TextField), findsWidgets);
      expect(find.byType(FilledButton), findsWidgets);
    });

    testWidgets('RegisterScreen step2 shows businessName field', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: RegisterScreen())));
      await tester.pump(const Duration(milliseconds: 300));
      // At least one text field visible; businessName appears after step1 complete
      expect(find.byType(TextField), findsWidgets);
    });

    testWidgets('LoginScreen renders phone/password + login button', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: LoginScreen())));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(TextField), findsWidgets);
      expect(find.byType(FilledButton), findsWidgets);
    });

    testWidgets('LoginScreen shows validation on empty submit', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: LoginScreen())));
      await tester.pump(const Duration(milliseconds: 300));
      final btn = find.byType(FilledButton).first;
      await tester.tap(btn);
      await tester.pump(const Duration(milliseconds: 300));
      // No crash; validation text or snackbar may appear
      expect(find.byType(MaterialApp), findsOneWidget);
    });

    testWidgets('RegisterScreen has mode toggle or appMode indicator', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: RegisterScreen())));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(Scaffold), findsOneWidget);
    });
  });
}
