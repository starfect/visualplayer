import 'package:flutter/material.dart';

import 'core/i18n.dart';
import 'features/bookmarks/bookmarks.dart';
import 'features/history/history.dart';
import 'features/home/home_shell.dart';
import 'features/playback/audio_handler.dart';
import 'features/settings/settings.dart';

/// Brand seed shared with the desktop and iOS apps.
const Color kBrand = Color(0xFF0040FF);

class VisualPlayerApp extends StatelessWidget {
  const VisualPlayerApp({
    super.key,
    required this.settings,
    required this.history,
    required this.bookmarks,
    required this.audioHandler,
  });

  final Settings settings;
  final History history;
  final Bookmarks bookmarks;
  final VisualAudioHandler audioHandler;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([settings, L.lang]),
      builder: (context, _) {
        return MaterialApp(
          title: 'VisualPlayer',
          debugShowCheckedModeBanner: false,
          themeMode: settings.theme,
          theme: _theme(Brightness.light),
          darkTheme: _theme(Brightness.dark),
          home: HomeShell(
            history: history,
            settings: settings,
            bookmarks: bookmarks,
            audioHandler: audioHandler,
          ),
        );
      },
    );
  }

  /// One cohesive Material 3 theme: rounded geometry, flat tinted surfaces and
  /// brand-tinted controls, applied to every shared component.
  ThemeData _theme(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(seedColor: kBrand, brightness: brightness);
    final dark = brightness == Brightness.dark;
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: dark ? const Color(0xFF0A0C12) : const Color(0xFFF6F7FB),
      visualDensity: VisualDensity.adaptivePlatformDensity,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        scrolledUnderElevation: 0,
        elevation: 0,
        backgroundColor: dark ? const Color(0xFF0A0C12) : const Color(0xFFF6F7FB),
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: scheme.onSurface,
          fontSize: 21,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 66,
        elevation: 0,
        backgroundColor: dark ? const Color(0xFF14171F) : Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primary.withValues(alpha: dark ? 0.26 : 0.14),
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: dark ? const Color(0xFF14171F) : Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        clipBehavior: Clip.antiAlias,
      ),
      listTileTheme: const ListTileThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      sliderTheme: SliderThemeData(
        trackHeight: 4,
        activeTrackColor: scheme.primary,
        inactiveTrackColor: scheme.primary.withValues(alpha: 0.22),
        thumbColor: scheme.primary,
        overlayShape: const RoundSliderOverlayShape(overlayRadius: 18),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        showDragHandle: true,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant.withValues(alpha: 0.5),
        space: 24,
      ),
    );
  }
}
