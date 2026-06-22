import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;

import '../../core/i18n.dart';
import '../../core/models.dart';
import '../history/history.dart';
import '../playlist/m3u.dart';
import '../playback/player_screen.dart';
import '../settings/settings.dart';
import '../settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.history, required this.settings});

  final History history;
  final Settings settings;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  void _play(List<MediaItem> queue, int index) {
    if (queue.isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PlayerScreen(
          queue: queue,
          index: index,
          history: widget.history,
          settings: widget.settings,
        ),
      ),
    );
  }

  Future<void> _openFiles() async {
    final result =
        await FilePicker.platform.pickFiles(allowMultiple: true, type: FileType.any);
    if (result == null) return;
    final items = <MediaItem>[];
    for (final file in result.files) {
      final path = file.path;
      if (path == null) continue;
      if (p.extension(path).toLowerCase() == '.m3u' ||
          p.extension(path).toLowerCase() == '.m3u8') {
        items.addAll(await _loadPlaylist(path));
      } else {
        items.add(MediaItem(path, title: file.name));
      }
    }
    if (items.isNotEmpty) _play(items, 0);
  }

  Future<List<MediaItem>> _loadPlaylist(String path) async {
    try {
      final content = await File(path).readAsString();
      return M3u.parse(content, baseDir: p.dirname(path));
    } catch (_) {
      return [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(L.t('app.title')),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: L.t('home.settings'),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => SettingsScreen(settings: widget.settings),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openFiles,
        icon: const Icon(Icons.folder_open),
        label: Text(L.t('home.open')),
      ),
      body: AnimatedBuilder(
        animation: widget.history,
        builder: (context, _) {
          final entries = widget.history.entries;
          if (entries.isEmpty) {
            return Center(child: Text(L.t('home.empty')));
          }
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
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
              Expanded(
                child: ListView.builder(
                  itemCount: entries.length,
                  itemBuilder: (context, i) {
                    final e = entries[i];
                    return ListTile(
                      leading: const Icon(Icons.movie),
                      title: Text(
                        e.title ?? p.basename(e.path),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(e.path,
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      onTap: () =>
                          _play([MediaItem(e.path, title: e.title)], 0),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
