import 'package:flutter/material.dart';

import '../../core/i18n.dart';
import '../../core/models.dart';
import '../history/history.dart';
import '../settings/settings.dart';
import 'library_view.dart';
import 'media_library.dart';

class AudioTab extends StatelessWidget {
  const AudioTab({
    super.key,
    required this.library,
    required this.history,
    required this.settings,
  });

  final MediaLibrary library;
  final History history;
  final Settings settings;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(L.t('nav.audio'))),
      body: LibraryView(
        library: library,
        kind: MediaKind.audio,
        history: history,
        settings: settings,
        grid: false,
      ),
    );
  }
}
