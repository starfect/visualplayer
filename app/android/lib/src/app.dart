import 'package:flutter/material.dart';

import 'core/i18n.dart';
import 'features/bookmarks/bookmarks.dart';
import 'features/history/history.dart';
import 'features/home/home_shell.dart';
import 'features/playback/audio_handler.dart';
import 'features/settings/settings.dart';

/// Brand seeds. Light uses the classic VisualPlayer blue; the dark-first
/// "Deep Cinema" look uses a luminous blue that glows on near-black.
const Color kBrandLight = Color(0xFF0040FF);
const Color kBrandDark = Color(0xFF4D7CFF);

/// Near-black cinema canvas.
const Color kCanvas = Color(0xFF06070A);
const Color kCinemaSurface = Color(0xFF12151D);

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

  /// One cohesive Material 3 theme. Dark is the hero: a near-black canvas,
  /// layered translucent surfaces, a glowing blue accent and rounded geometry.
  ThemeData _theme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: dark ? kBrandDark : kBrandLight,
      brightness: brightness,
    ).copyWith(
      surface: dark ? kCanvas : const Color(0xFFF6F7FB),
      surfaceContainerLow: dark ? const Color(0xFF0E1118) : Colors.white,
      surfaceContainer: dark ? kCinemaSurface : Colors.white,
      surfaceContainerHigh: dark ? const Color(0xFF1A1E28) : const Color(0xFFEEF1F7),
    );
    final canvas = dark ? kCanvas : const Color(0xFFF6F7FB);
    final accent = dark ? kBrandDark : kBrandLight;
    final sheetColor = dark ? const Color(0xFF14171F) : Colors.white;

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        scrolledUnderElevation: 0,
        elevation: 0,
        backgroundColor: canvas,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: scheme.onSurface,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        elevation: 0,
        backgroundColor: dark ? const Color(0xFF0B0E14) : Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: accent.withValues(alpha: dark ? 0.30 : 0.14),
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected) ? accent : scheme.onSurfaceVariant,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected) ? accent : scheme.onSurfaceVariant,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: dark ? const Color(0xFF12151D) : Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        clipBehavior: Clip.antiAlias,
      ),
      listTileTheme: const ListTileThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(14))),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: Colors.white,
          elevation: dark ? 10 : 6,
          shadowColor: accent.withValues(alpha: 0.6),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      sliderTheme: SliderThemeData(
        trackHeight: 4,
        activeTrackColor: accent,
        inactiveTrackColor: accent.withValues(alpha: 0.24),
        thumbColor: accent,
        overlayColor: accent.withValues(alpha: 0.16),
        overlayShape: const RoundSliderOverlayShape(overlayRadius: 18),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: sheetColor,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        showDragHandle: true,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: sheetColor,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: dark ? const Color(0xFF1A1E28) : null,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant.withValues(alpha: 0.5),
        space: 24,
      ),
    );
  }
}
