import '../../core/models.dart';

/// Parse and serialize extended-M3U playlists.
class M3u {
  static List<MediaItem> parse(String content, {String? baseDir}) {
    final items = <MediaItem>[];
    String? pendingTitle;
    for (final raw in content.split('\n')) {
      final line = raw.trim();
      if (line.isEmpty) continue;
      if (line.startsWith('#EXTINF:')) {
        final comma = line.indexOf(',');
        pendingTitle = comma >= 0 ? line.substring(comma + 1).trim() : null;
        if (pendingTitle != null && pendingTitle.isEmpty) pendingTitle = null;
        continue;
      }
      if (line.startsWith('#')) continue;
      final resolved = (line.contains('://') || line.startsWith('/') || baseDir == null)
          ? line
          : '$baseDir/$line';
      items.add(MediaItem(resolved, title: pendingTitle));
      pendingTitle = null;
    }
    return items;
  }

  static String serialize(List<MediaItem> items) {
    final buffer = StringBuffer('#EXTM3U\n');
    for (final item in items) {
      buffer.writeln('#EXTINF:-1,${item.title ?? ''}');
      buffer.writeln(item.path);
    }
    return buffer.toString();
  }
}
