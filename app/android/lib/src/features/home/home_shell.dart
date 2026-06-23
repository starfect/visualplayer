import 'package:flutter/material.dart';

import '../../core/i18n.dart';
import '../../core/models.dart';
import '../bookmarks/bookmarks.dart';
import '../history/history.dart';
import '../library/library_tab.dart';
import '../library/media_library.dart';
import '../playback/audio_handler.dart';
import '../settings/settings.dart';
import '../settings/settings_screen.dart';
import 'browse_tab.dart';

/// Root shell with a VLC-style bottom navigation: Video, Audio, Browse, Settings.
class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.history,
    required this.settings,
    required this.bookmarks,
    required this.audioHandler,
  });

  final History history;
  final Settings settings;
  final Bookmarks bookmarks;
  final VisualAudioHandler audioHandler;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  final MediaLibrary _library = MediaLibrary();
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final tabs = <Widget>[
      LibraryTab(
        library: _library,
        kind: MediaKind.video,
        history: widget.history,
        settings: widget.settings,
        bookmarks: widget.bookmarks,
        audioHandler: widget.audioHandler,
        grid: true,
        title: L.t('nav.video'),
      ),
      LibraryTab(
        library: _library,
        kind: MediaKind.audio,
        history: widget.history,
        settings: widget.settings,
        bookmarks: widget.bookmarks,
        audioHandler: widget.audioHandler,
        grid: false,
        title: L.t('nav.audio'),
      ),
      BrowseTab(
        history: widget.history,
        settings: widget.settings,
        bookmarks: widget.bookmarks,
        audioHandler: widget.audioHandler,
      ),
      SettingsScreen(
        settings: widget.settings,
        history: widget.history,
        bookmarks: widget.bookmarks,
      ),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.video_library_outlined),
            selectedIcon: const Icon(Icons.video_library),
            label: L.t('nav.video'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.library_music_outlined),
            selectedIcon: const Icon(Icons.library_music),
            label: L.t('nav.audio'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.folder_outlined),
            selectedIcon: const Icon(Icons.folder),
            label: L.t('nav.browse'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.settings_outlined),
            selectedIcon: const Icon(Icons.settings),
            label: L.t('nav.settings'),
          ),
        ],
      ),
    );
  }
}
