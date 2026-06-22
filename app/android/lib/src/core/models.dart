/// A playable media reference shared across features.
class MediaItem {
  const MediaItem(this.path, {this.title});

  final String path;
  final String? title;

  String get displayTitle => title ?? path.split(RegExp(r'[\\/]')).last;
}
