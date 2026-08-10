import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:window_manager/window_manager.dart';

import 'core/theme/app_theme.dart';
import 'routes/app_router.dart';
import 'shared/services/api_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await ApiClient.init();

  if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
    await windowManager.ensureInitialized();
    const options = WindowOptions(
      size: Size(1280, 720),
      center: true,
      title: 'Beres Kasir',
      minimumSize: Size(1024, 600),
    );
    await windowManager.waitUntilReadyToShow(options, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  runApp(const ProviderScope(child: BeresPosApp()));
}

class BeresPosApp extends ConsumerWidget {
  const BeresPosApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return FTheme(
      data: AppTheme.fTheme,
      child: MaterialApp.router(
        title: 'Beres Kasir',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: ThemeMode.system,
        routerConfig: router,
        builder: (context, child) => FToaster(child: child!),
      ),
    );
  }
}
