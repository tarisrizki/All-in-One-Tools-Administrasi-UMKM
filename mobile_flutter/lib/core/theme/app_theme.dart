import 'package:flutter/material.dart';
import 'package:forui/forui.dart' as forui;

/// Tema Beres POS — putih-biru (seed 0xFF1565C0), ForUI zinc.desktop + Material 3 sinkron.
/// Primary biru 1565C0, bg putih FAFAF8, semantic AppColors tetap.
class AppTheme {
  AppTheme._();

  static const _seed = Color(0xFF1565C0);
  static const bg = Color(0xFFFAFAF8);
  static forui.FThemeData get fTheme => forui.FTheme.neutral.light.desktop;


  static ThemeData _m3(ColorScheme s) => ThemeData(
        useMaterial3: true,
        colorScheme: s,
        scaffoldBackgroundColor: bg,
        appBarTheme: AppBarTheme(backgroundColor: bg, foregroundColor: s.onSurface, elevation: 0, centerTitle: false, scrolledUnderElevation: 0),
        cardTheme: CardThemeData(elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: s.outlineVariant.withValues(alpha: 0.6))), clipBehavior: Clip.antiAlias),
        filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(44), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
        inputDecorationTheme: InputDecorationTheme(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
      );

  static ThemeData light() => _m3(ColorScheme.fromSeed(seedColor: _seed));
  static ThemeData dark() => _m3(ColorScheme.fromSeed(seedColor: _seed, brightness: Brightness.dark));
  static ThemeData get theme => light();
}
