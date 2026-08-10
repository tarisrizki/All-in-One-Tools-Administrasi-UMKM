import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Semantic & Modern UI colors for Beres POS.
abstract class AppColors {
  AppColors._();

  // Primary Palette
  static const primary = Color(0xFF1565C0);
  static const primaryDark = Color(0xFF0F172A);
  static const primaryContainer = Color(0xFFEFF6FF);

  // Semantic Status Colors
  static const success = Color(0xFF059669);
  static const successBg = Color(0xFFD1FAE5);
  static const error = Color(0xFFE11D48);
  static const errorBg = Color(0xFFFFE4E6);
  static const warning = Color(0xFFD97706);
  static const warningBg = Color(0xFFFEF3C7);
  static const info = Color(0xFF2563EB);
  static const infoBg = Color(0xFFDBEAFE);

  // Neutral & Surfaces
  static const bg = Color(0xFFF8FAFC);
  static const surface = Colors.white;
  static const border = Color(0xFFE2E8F0);
  static const textSecondary = Color(0xFF64748B);

  /// Currency Helper: Format integer to Indonesian Rupiah (e.g. 150000 -> Rp 150.000)
  static String formatRupiah(num amount) {
    final formatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    return formatter.format(amount);
  }
}

