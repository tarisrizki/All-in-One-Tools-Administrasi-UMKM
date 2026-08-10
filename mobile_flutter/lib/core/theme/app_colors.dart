import 'package:flutter/material.dart';

/// Semantic colors — centralized, bukan hardcode Colors.xxx tersebar.
/// Base UI: putih-biru via AppTheme seed 0xFF1565C0.
/// Semantic hijau/merah/kuning tetap untuk meaning, tapi via token ini.
abstract class AppColors {
  AppColors._();

  // Semantic
  static const success = Color(0xFF2E7D32); // stok cukup, lunas — hijau
  static const successBg = Color(0xFFE8F5E9);
  static const error = Color(0xFFC62828); // gagal, habis
  static const errorBg = Color(0xFFFCE4EC);
  static const warning = Color(0xFFEF6C00); // kedaluarsa, warning
  static const warningBg = Color(0xFFFFF3E0);
  static const info = Color(0xFF1565C0); // sama seed biru
  static const infoBg = Color(0xFFE3F2FD);

  // Neutral (override M3 surface bila perlu very-light)
  static const surfaceMuted = Color(0xFFF8FAFC);
}
