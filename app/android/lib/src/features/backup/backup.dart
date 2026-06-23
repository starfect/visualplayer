import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../bookmarks/bookmarks.dart';
import '../history/history.dart';
import '../settings/settings.dart';

/// Local backup/restore of preferences, recent history and bookmarks as a
/// single JSON file. Everything stays on-device: export writes a file the user
/// picks a location for; import reads one back. No network is involved.
class Backup {
  Backup({required this.settings, required this.history, required this.bookmarks});

  static const _version = 1;
  static const _fileName = 'visualplayer-backup.json';

  final Settings settings;
  final History history;
  final Bookmarks bookmarks;

  Map<String, dynamic> _snapshot() => {
        'version': _version,
        'exportedAt': DateTime.now().toIso8601String(),
        'settings': settings.toJson(),
        'history': history.toJson(),
        'bookmarks': bookmarks.toJson(),
      };

  /// Writes the backup and asks the user where to save it. Returns the saved
  /// path, or null if the user cancelled.
  Future<String?> export() async {
    final json = const JsonEncoder.withIndent('  ').convert(_snapshot());
    final bytes = utf8.encode(json);
    final location = await FilePicker.platform.saveFile(
      dialogTitle: 'VisualPlayer backup',
      fileName: _fileName,
      type: FileType.custom,
      allowedExtensions: const ['json'],
      bytes: bytes,
    );
    if (location == null) return null;
    // On some platforms saveFile only returns the path and does not write the
    // bytes itself, so write defensively when the file is missing/empty.
    final file = File(location);
    if (!await file.exists() || await file.length() == 0) {
      await file.writeAsBytes(bytes, flush: true);
    }
    return location;
  }

  /// Lets the user pick a backup file and restores its contents. Returns true
  /// on success, false if cancelled or the file was not a valid backup.
  Future<bool> import() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['json'],
      withData: true,
    );
    final picked = result?.files.single;
    if (picked == null) return false;
    try {
      final raw = picked.bytes != null
          ? utf8.decode(picked.bytes!)
          : await File(picked.path!).readAsString();
      final data = jsonDecode(raw) as Map<String, dynamic>;
      if (data['settings'] is Map) {
        settings.applyJson(data['settings'] as Map<String, dynamic>);
      }
      if (data['history'] is List) history.replaceAll(data['history'] as List);
      if (data['bookmarks'] is Map) {
        bookmarks.replaceAll(data['bookmarks'] as Map<String, dynamic>);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Directory used for transient backup artifacts (currently unused by the UI
  /// but handy for tests and future scheduled exports).
  static Future<Directory> workingDir() => getTemporaryDirectory();
}
