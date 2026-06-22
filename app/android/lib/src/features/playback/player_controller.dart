import 'dart:io';

import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:path/path.dart' as p;

import '../equalizer/equalizer.dart';

/// Wraps a media_kit [Player] (libmpv) with the VisualPlayer feature surface:
/// subtitles, the audio equalizer, and chapter navigation. mpv-only features go
/// through [NativePlayer]; everything else uses the high-level player API.
class PlayerController {
  PlayerController() {
    controller = VideoController(player);
  }

  final Player player = Player();
  late final VideoController controller;

  bool eqEnabled = false;
  double preamp = 0;
  List<double> gains = List<double>.filled(kEqBands.length, 0);

  Future<void> open(String source, {Duration? start}) async {
    await player.open(Media(_toUri(source)));
    if (start != null && start.inSeconds > 1) {
      await player.stream.duration
          .firstWhere((d) => d > Duration.zero)
          .timeout(const Duration(seconds: 6), onTimeout: () => Duration.zero);
      await player.seek(start);
    }
    if (!source.contains('://')) {
      final subs = await _siblingSubtitles(source);
      if (subs.isNotEmpty) await addSubtitle(subs.first);
    }
  }

  String _toUri(String source) =>
      source.contains('://') ? source : Uri.file(source).toString();

  Future<void> addSubtitle(String pathOrUri) =>
      player.setSubtitleTrack(SubtitleTrack.uri(_toUri(pathOrUri)));

  Future<void> disableSubtitle() => player.setSubtitleTrack(SubtitleTrack.no());

  Future<void> nextChapter() => _command(['add', 'chapter', '1']);

  Future<void> prevChapter() => _command(['add', 'chapter', '-1']);

  Future<void> applyEqualizer() async {
    final platform = player.platform;
    if (platform is NativePlayer) {
      await platform.setProperty(
        'af',
        eqEnabled ? buildAudioFilter(preamp, gains) : '',
      );
    }
  }

  Future<void> _command(List<String> args) async {
    final platform = player.platform;
    if (platform is NativePlayer) await platform.command(args);
  }

  Future<List<String>> _siblingSubtitles(String path) async {
    try {
      final dir = Directory(p.dirname(path));
      final base = p.basenameWithoutExtension(path);
      const exts = {'.srt', '.ass', '.ssa', '.vtt', '.sub'};
      final out = <String>[];
      await for (final entity in dir.list()) {
        if (entity is File) {
          final name = p.basename(entity.path);
          if (name.startsWith(base) &&
              exts.contains(p.extension(entity.path).toLowerCase())) {
            out.add(entity.path);
          }
        }
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  Future<void> dispose() => player.dispose();
}
