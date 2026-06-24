import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/i18n.dart';
import '../../core/models.dart';
import '../bookmarks/bookmarks.dart';
import '../history/history.dart';
import '../playback/audio_handler.dart';
import '../playback/launch.dart';
import '../settings/settings.dart';
import 'media_library.dart';

/// Reusable library browser: requests permission, scans on-device media of a
/// [MediaKind], and shows it as a thumbnail grid (video) or a list (audio).
/// Tapping plays the item with the rest of the list as the queue.
class LibraryView extends StatefulWidget {
  const LibraryView({
    super.key,
    required this.library,
    required this.kind,
    required this.history,
    required this.settings,
    required this.bookmarks,
    required this.audioHandler,
    required this.grid,
    this.folderId,
  });

  final MediaLibrary library;
  final MediaKind kind;
  final History history;
  final Settings settings;
  final Bookmarks bookmarks;
  final VisualAudioHandler audioHandler;
  final bool grid;

  /// When set, shows the items of a single folder instead of the whole library.
  final String? folderId;

  @override
  State<LibraryView> createState() => _LibraryViewState();
}

class _LibraryViewState extends State<LibraryView> {
  late Future<List<MediaItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<MediaItem>> _load() async {
    final granted = await widget.library.ensurePermission();
    if (!granted) throw _PermissionDenied();
    return widget.folderId != null
        ? widget.library.folderItems(widget.folderId!, widget.kind)
        : widget.library.all(widget.kind);
  }

  Future<void> _refresh() async {
    final future = _load();
    setState(() => _future = future);
    await future.catchError((_) => <MediaItem>[]);
  }

  void _play(List<MediaItem> items, int index) {
    playMedia(context, items, index,
        history: widget.history,
        settings: widget.settings,
        bookmarks: widget.bookmarks,
        audioHandler: widget.audioHandler);
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<List<MediaItem>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _Message(
              icon: Icons.lock_outline,
              text: L.t('library.permission'),
              action: FilledButton(onPressed: _refresh, child: Text(L.t('library.grant'))),
            );
          }
          final items = snapshot.data ?? const <MediaItem>[];
          if (items.isEmpty) {
            return _Message(
              icon: widget.kind == MediaKind.audio ? Icons.music_off : Icons.videocam_off,
              text: L.t('library.empty'),
            );
          }
          return widget.grid ? _grid(items) : _list(items);
        },
      ),
    );
  }

  Widget _grid(List<MediaItem> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 220,
        childAspectRatio: 0.85,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: items.length,
      itemBuilder: (context, i) => _GridCard(
        item: items[i],
        library: widget.library,
        onTap: () => _play(items, i),
      ),
    );
  }

  Widget _list(List<MediaItem> items) {
    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (context, i) {
        final item = items[i];
        return ListTile(
          leading: CircleAvatar(
            child: Icon(item.isAudio ? Icons.music_note : Icons.movie),
          ),
          title: Text(item.displayTitle, maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: item.durationSeconds > 0 ? Text(Format.seconds(item.durationSeconds)) : null,
          onTap: () => _play(items, i),
        );
      },
    );
  }
}

class _GridCard extends StatelessWidget {
  const _GridCard({required this.item, required this.library, required this.onTap});

  final MediaItem item;
  final MediaLibrary library;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: const Icon(Icons.movie, size: 36),
                  ),
                  if (item.id != null)
                    FutureBuilder(
                      future: library.thumbnail(item.id!),
                      builder: (context, snapshot) {
                        final data = snapshot.data;
                        if (data == null) return const SizedBox.shrink();
                        return Image.memory(data, fit: BoxFit.cover, gaplessPlayback: true);
                      },
                    ),
                  if (item.durationSeconds > 0)
                    Positioned(
                      right: 4,
                      bottom: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        color: Colors.black54,
                        child: Text(
                          Format.seconds(item.durationSeconds),
                          style: const TextStyle(color: Colors.white, fontSize: 11),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Text(
              item.displayTitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text, this.action});

  final IconData icon;
  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 56, color: Theme.of(context).disabledColor),
        const SizedBox(height: 12),
        Center(child: Text(text)),
        if (action != null) ...[const SizedBox(height: 16), Center(child: action!)],
      ],
    );
  }
}

class _PermissionDenied implements Exception {}
