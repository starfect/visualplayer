import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;

import '../../core/i18n.dart';
import '../../core/models.dart';
import '../bookmarks/bookmarks.dart';
import '../history/history.dart';
import '../playback/audio_handler.dart';
import '../playback/launch.dart';
import '../playlist/m3u.dart';
import '../settings/settings.dart';

/// "Browse" tab: open arbitrary files / playlists with the picker and replay
/// recent items.
class BrowseTab extends StatefulWidget {
  const BrowseTab({
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
  State<BrowseTab> createState() => _BrowseTabState();
}

class _BrowseTabState extends State<BrowseTab> {
  Future<void> _openFiles() async {
    final result =
        await FilePicker.platform.pickFiles(allowMultiple: true, type: FileType.any);
    if (result == null) return;
    final items = <MediaItem>[];
    for (final file in result.files) {
      final path = file.path;
      if (path == null) continue;
      final ext = p.extension(path).toLowerCase();
      if (ext == '.m3u' || ext == '.m3u8') {
        items.addAll(await _loadPlaylist(path));
      } else {
        items.add(MediaItem(path, title: file.name));
      }
    }
    if (items.isNotEmpty && mounted) {
      playMedia(context, items, 0,
          history: widget.history,
          settings: widget.settings,
          bookmarks: widget.bookmarks,
          audioHandler: widget.audioHandler);
    }
  }

  Future<List<MediaItem>> _loadPlaylist(String path) async {
    try {
      final content = await File(path).readAsString();
      return M3u.parse(content, baseDir: p.dirname(path));
    } catch (_) {
      return const [];
    }
  }

  void _playRecent(String path, String? title) {
    playMedia(context, [MediaItem(path, title: title)], 0,
        history: widget.history,
        settings: widget.settings,
        bookmarks: widget.bookmarks,
        audioHandler: widget.audioHandler);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(L.t('nav.browse'))),
      body: AnimatedBuilder(
        animation: widget.history,
        builder: (context, _) {
          final entries = widget.history.entries;
          return ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton.icon(
                  onPressed: _openFiles,
                  icon: const Icon(Icons.folder_open),
                  label: Text(L.t('home.open')),
                ),
              ),
              if (entries.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(child: Text(L.t('home.empty'))),
                )
              else ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                  child: Row(
                    children: [
                      Text(L.t('home.recent'),
                          style: Theme.of(context).textTheme.titleMedium),
                      const Spacer(),
                      TextButton(
                        onPressed: widget.history.clear,
                        child: Text(L.t('home.clear')),
                      ),
                    ],
                  ),
                ),
                for (final e in entries)
                  ListTile(
                    leading: const Icon(Icons.history),
                    title: Text(e.title ?? p.basename(e.path),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle:
                        Text(e.path, maxLines: 1, overflow: TextOverflow.ellipsis),
                    onTap: () => _playRecent(e.path, e.title),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}
