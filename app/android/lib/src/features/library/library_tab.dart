import 'package:flutter/material.dart';

import '../../core/i18n.dart';
import '../../core/models.dart';
import '../history/history.dart';
import '../settings/settings.dart';
import 'folders_view.dart';
import 'library_view.dart';
import 'media_library.dart';

/// A library tab (Video or Audio) that toggles between the full list and a
/// folder browser.
class LibraryTab extends StatefulWidget {
  const LibraryTab({
    super.key,
    required this.library,
    required this.kind,
    required this.history,
    required this.settings,
    required this.grid,
    required this.title,
  });

  final MediaLibrary library;
  final MediaKind kind;
  final History history;
  final Settings settings;
  final bool grid;
  final String title;

  @override
  State<LibraryTab> createState() => _LibraryTabState();
}

class _LibraryTabState extends State<LibraryTab> {
  bool _folders = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          IconButton(
            tooltip: L.t(_folders ? 'library.all' : 'library.folders'),
            icon: Icon(_folders ? Icons.view_list : Icons.folder_outlined),
            onPressed: () => setState(() => _folders = !_folders),
          ),
        ],
      ),
      body: _folders
          ? FoldersView(
              library: widget.library,
              kind: widget.kind,
              history: widget.history,
              settings: widget.settings,
            )
          : LibraryView(
              library: widget.library,
              kind: widget.kind,
              history: widget.history,
              settings: widget.settings,
              grid: widget.grid,
            ),
    );
  }
}
