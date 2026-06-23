import 'dart:typed_data';

import 'package:photo_manager/photo_manager.dart';

import '../../core/models.dart';

/// A device folder (MediaStore bucket) holding video or audio.
class MediaFolder {
  const MediaFolder({required this.id, required this.name, required this.count, required this.kind});

  final String id;
  final String name;
  final int count;
  final MediaKind kind;
}

/// Scans the device's media (videos and audio) through the platform MediaStore.
/// Fully on-device — no network or server access. Asset handles are cached so
/// the UI can lazily load thumbnails for visible items only.
class MediaLibrary {
  final Map<String, AssetEntity> _assets = {};
  final Map<String, AssetPathEntity> _paths = {};

  static RequestType _type(MediaKind kind) =>
      kind == MediaKind.audio ? RequestType.audio : RequestType.video;

  Future<bool> ensurePermission() async {
    final state = await PhotoManager.requestPermissionExtend();
    return state.hasAccess;
  }

  /// All items of [kind], newest first.
  Future<List<MediaItem>> all(MediaKind kind) async {
    final paths = await PhotoManager.getAssetPathList(
      type: _type(kind),
      onlyAll: true,
    );
    if (paths.isEmpty) return const [];
    return _itemsOf(paths.first, kind);
  }

  /// Folders (buckets) that contain media of [kind], alphabetically.
  Future<List<MediaFolder>> folders(MediaKind kind) async {
    final paths = await PhotoManager.getAssetPathList(type: _type(kind));
    final folders = <MediaFolder>[];
    for (final path in paths) {
      final count = await path.assetCountAsync;
      if (count == 0) continue;
      _paths[path.id] = path;
      folders.add(MediaFolder(id: path.id, name: path.name, count: count, kind: kind));
    }
    folders.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return folders;
  }

  Future<List<MediaItem>> folderItems(String folderId, MediaKind kind) async {
    final path = _paths[folderId];
    if (path == null) return const [];
    return _itemsOf(path, kind);
  }

  Future<Uint8List?> thumbnail(String assetId, {int size = 256}) {
    final asset = _assets[assetId];
    if (asset == null) return Future.value(null);
    return asset.thumbnailDataWithSize(ThumbnailSize.square(size));
  }

  Future<List<MediaItem>> _itemsOf(AssetPathEntity path, MediaKind kind) async {
    final count = await path.assetCountAsync;
    final assets = await path.getAssetListRange(start: 0, end: count);
    final items = <MediaItem>[];
    for (final asset in assets) {
      _assets[asset.id] = asset;
      final file = await asset.file;
      if (file == null) continue;
      items.add(MediaItem(
        file.path,
        title: (asset.title?.isNotEmpty ?? false) ? asset.title : null,
        durationSeconds: asset.duration,
        kind: kind,
        id: asset.id,
      ));
    }
    return items;
  }
}
