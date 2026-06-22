import 'package:flutter/material.dart';

import 'features/home/home_screen.dart';
import 'core/i18n.dart';
import 'features/history/history.dart';
import 'features/settings/settings.dart';

class VisualPlayerApp extends StatelessWidget {
  const VisualPlayerApp({super.key, required this.settings, required this.history});

  final Settings settings;
  final History history;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([settings, L.lang]),
      builder: (context, _) {
        return MaterialApp(
          title: 'VisualPlayer',
          debugShowCheckedModeBanner: false,
          themeMode: settings.theme,
          theme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.light,
            colorSchemeSeed: const Color(0xFF0040FF),
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.dark,
            colorSchemeSeed: const Color(0xFF0040FF),
          ),
          home: HomeScreen(history: history, settings: settings),
        );
      },
    );
  }
}
