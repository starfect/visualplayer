import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A saved position inside a media file the user can jump back to.
class Bookmark {
  Bookmark({required this.position, this.label, required this.createdAt});

  /// Offset into the media, in seconds.
  final int position;

  /// Optional user label; falls back to the formatted timestamp in the UI.
  final String? label;
  final int createdAt;

  Map<String, dynamic> toJson() => {
        'position': position,
        'label': label,
        'createdAt': createdAt,
      };

  static Bookmark fromJson(Map<String, dynamic> json) => Bookmark(
        position: (json['position'] as num?)?.toInt() ?? 0,
        label: json['label'] as String?,
        createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
      );
}

/// Per-file bookmarks, keyed by media path and persisted as JSON. Mirrors the
/// [History] store's shape so both round-trip cleanly through backup/restore.
class Bookmarks extends ChangeNotifier {
  Bookmarks(this._prefs) {
    final raw = _prefs.getString(_key);
    if (raw != null) _decode(raw);
  }

  static const _key = 'bookmarks';

  final SharedPreferences _prefs;
  final Map<String, List<Bookmark>> _byPath = {};

  /// Bookmarks for [path], sorted by position.
  List<Bookmark> forPath(String path) {
    final list = List<Bookmark>.from(_byPath[path] ?? const []);
    list.sort((a, b) => a.position.compareTo(b.position));
    return list;
  }

  bool get isEmpty => _byPath.isEmpty;

  void add(String path, int position, {String? label}) {
    final list = _byPath.putIfAbsent(path, () => <Bookmark>[]);
    list.add(Bookmark(
      position: position,
      label: label,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ));
    _persist();
    notifyListeners();
  }

  void remove(String path, Bookmark bookmark) {
    final list = _byPath[path];
    if (list == null) return;
    list.remove(bookmark);
    if (list.isEmpty) _byPath.remove(path);
    _persist();
    notifyListeners();
  }

  void clear() {
    _byPath.clear();
    _persist();
    notifyListeners();
  }

  /// Serializes every bookmark for inclusion in a backup file.
  Map<String, dynamic> toJson() => {
        for (final entry in _byPath.entries)
          entry.key: entry.value.map((b) => b.toJson()).toList(),
      };

  /// Replaces all bookmarks from a restored backup payload.
  void replaceAll(Map<String, dynamic> json) {
    _byPath.clear();
    json.forEach((path, value) {
      if (value is List) {
        _byPath[path] = value
            .map((e) => Bookmark.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    });
    _persist();
    notifyListeners();
  }

  void _decode(String raw) {
    final map = jsonDecode(raw) as Map<String, dynamic>;
    map.forEach((path, value) {
      if (value is List) {
        _byPath[path] = value
            .map((e) => Bookmark.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    });
  }

  void _persist() => _prefs.setString(_key, jsonEncode(toJson()));
}
