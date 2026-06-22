import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MediaItem {
  const MediaItem(this.path, {this.title});
  final String path;
  final String? title;

  String get displayTitle => title ?? path.split(RegExp(r'[\\/]')).last;
}

class HistoryEntry {
  HistoryEntry({
    required this.path,
    this.title,
    this.position = 0,
    this.duration = 0,
    required this.lastOpened,
  });

  final String path;
  final String? title;
  final int position;
  final int duration;
  final int lastOpened;

  Map<String, dynamic> toJson() => {
        'path': path,
        'title': title,
        'position': position,
        'duration': duration,
        'lastOpened': lastOpened,
      };

  static HistoryEntry fromJson(Map<String, dynamic> json) => HistoryEntry(
        path: json['path'] as String,
        title: json['title'] as String?,
        position: (json['position'] as num?)?.toInt() ?? 0,
        duration: (json['duration'] as num?)?.toInt() ?? 0,
        lastOpened: (json['lastOpened'] as num?)?.toInt() ?? 0,
      );
}

/// Recent-files / resume store, persisted as JSON in `shared_preferences`.
class History extends ChangeNotifier {
  History(this._prefs) {
    final raw = _prefs.getString(_key);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _entries
        ..clear()
        ..addAll(list.map((e) => HistoryEntry.fromJson(e as Map<String, dynamic>)));
    }
  }

  static const _key = 'history';
  static const _max = 50;

  final SharedPreferences _prefs;
  final List<HistoryEntry> _entries = [];

  List<HistoryEntry> get entries => List.unmodifiable(_entries);

  int? resumePosition(String path) {
    for (final e in _entries) {
      if (e.path == path) return e.position;
    }
    return null;
  }

  void record(String path, {String? title, int position = 0, int duration = 0}) {
    _entries.removeWhere((e) => e.path == path);
    _entries.insert(
      0,
      HistoryEntry(
        path: path,
        title: title,
        position: position,
        duration: duration,
        lastOpened: DateTime.now().millisecondsSinceEpoch,
      ),
    );
    if (_entries.length > _max) _entries.removeRange(_max, _entries.length);
    _persist();
    notifyListeners();
  }

  void clear() {
    _entries.clear();
    _persist();
    notifyListeners();
  }

  void _persist() {
    _prefs.setString(_key, jsonEncode(_entries.map((e) => e.toJson()).toList()));
  }
}

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
