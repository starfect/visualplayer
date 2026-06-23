import 'package:flutter/material.dart';

import '../../core/i18n.dart';
import '../../core/models.dart';
import '../history/history.dart';
import '../settings/settings.dart';
import 'library_view.dart';
import 'media_library.dart';

/// Lists the device folders (MediaStore buckets) that hold media of a kind.
class FoldersView extends StatefulWidget {
  const FoldersView({
    super.key,
    required this.library,
    required this.kind,
    required this.history,
    required this.settings,
  });

  final MediaLibrary library;
  final MediaKind kind;
  final History history;
  final Settings settings;

  @override
  State<FoldersView> createState() => _FoldersViewState();
}

class _FoldersViewState extends State<FoldersView> {
  late Future<List<MediaFolder>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<MediaFolder>> _load() async {
    final granted = await widget.library.ensurePermission();
    if (!granted) return const [];
    return widget.library.folders(widget.kind);
  }

  void _open(MediaFolder folder) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(folder.name)),
          body: LibraryView(
            library: widget.library,
            kind: widget.kind,
            history: widget.history,
            settings: widget.settings,
            grid: widget.kind == MediaKind.video,
            folderId: folder.id,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<MediaFolder>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final folders = snapshot.data ?? const <MediaFolder>[];
        if (folders.isEmpty) {
          return Center(child: Text(L.t('library.empty')));
        }
        return ListView.builder(
          itemCount: folders.length,
          itemBuilder: (context, i) {
            final folder = folders[i];
            return ListTile(
              leading: const Icon(Icons.folder),
              title: Text(folder.name, maxLines: 1, overflow: TextOverflow.ellipsis),
              trailing: Text('${folder.count}'),
              onTap: () => _open(folder),
            );
          },
        );
      },
    );
  }
}
