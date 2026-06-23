import 'dart:typed_data';

/// What a media item is, used to pick the right player surface and library tab.
enum MediaKind { video, audio, unknown }

/// A playable media reference shared across features.
class MediaItem {
  const MediaItem(
    this.path, {
    this.title,
    this.durationSeconds = 0,
    this.kind = MediaKind.unknown,
    this.id,
    this.thumbnail,
  });

  final String path;
  final String? title;
  final int durationSeconds;
  final MediaKind kind;

  /// Optional platform asset id (media library) and a cached thumbnail.
  final String? id;
  final Uint8List? thumbnail;

  String get displayTitle => title ?? path.split(RegExp(r'[\\/]')).last;

  bool get isAudio => kind == MediaKind.audio;

  MediaItem copyWith({Uint8List? thumbnail}) => MediaItem(
        path,
        title: title,
        durationSeconds: durationSeconds,
        kind: kind,
        id: id,
        thumbnail: thumbnail ?? this.thumbnail,
      );
}
