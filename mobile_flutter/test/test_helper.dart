import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:forui/forui.dart';
import 'package:beres_pos/core/theme/app_theme.dart';

/// Test wrapper ensuring Forui theme and toaster context are properly injected.
Widget testableWidget(Widget child) {
  Animate.defaultDuration = Duration.zero;
  return FTheme(
    data: AppTheme.fTheme,
    child: MaterialApp(
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      home: FToaster(child: child),
    ),
  );
}

