import 'dart:io';

import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../equalizer/equalizer.dart';

/// Selectable display aspect ratios (mpv `video-aspect-override`).
const List<String> kAspectRatios = ['-1', '16:9', '4:3', '21:9', '1:1', '2.35:1'];

/// Real-time video colour adjustment channels (mpv properties, range -100…100).
const List<String> kVideoAdjustments = ['brightness', 'contrast', 'saturation', 'gamma', 'hue'];

/// Wraps a media_kit [Player] (libmpv) with the full VisualPlayer feature
/// surface: subtitles, equalizer, chapters, track selection, A/V sync, video
/// adjustments, aspect/zoom/rotation, A-B loop and snapshots. mpv-only features
/// go through [NativePlayer]; everything else uses the high-level player API.
class PlayerController {
  PlayerController() {
    controller = VideoController(player);
  }

  final Player player = Player();
  late final VideoController controller;

  bool eqEnabled = false;
  double preamp = 0;
  List<double> gains = List<double>.filled(kEqBands.length, 0);

  final Map<String, double> adjustments = {for (final k in kVideoAdjustments) k: 0};
  int aspectIndex = 0;
  double zoom = 0;
  int rotation = 0;
  double audioDelay = 0;
  double subtitleDelay = 0;
  Duration? abLoopStart;
  Duration? abLoopEnd;

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
    final dynamic platform = player.platform;
    if (platform == null) return;
    try {
      await platform.setProperty('af', eqEnabled ? buildAudioFilter(preamp, gains) : '');
    } catch (_) {
      // mpv property unavailable on this platform; ignore.
    }
  }

  // ---- Track selection -----------------------------------------------------
  List<AudioTrack> get audioTracks => player.state.tracks.audio;
  List<SubtitleTrack> get subtitleTracks => player.state.tracks.subtitle;
  Future<void> selectAudioTrack(AudioTrack track) => player.setAudioTrack(track);
  Future<void> selectSubtitleTrack(SubtitleTrack track) => player.setSubtitleTrack(track);

  // ---- A/V sync ------------------------------------------------------------
  Future<void> setAudioDelay(double seconds) async {
    audioDelay = seconds;
    await _setProperty('audio-delay', seconds.toStringAsFixed(3));
  }

  Future<void> setSubtitleDelay(double seconds) async {
    subtitleDelay = seconds;
    await _setProperty('sub-delay', seconds.toStringAsFixed(3));
  }

  // ---- Video adjustments / geometry ---------------------------------------
  Future<void> setAdjustment(String channel, double value) async {
    adjustments[channel] = value;
    await _setProperty(channel, value.round().toString());
  }

  Future<void> resetAdjustments() async {
    for (final channel in kVideoAdjustments) {
      await setAdjustment(channel, 0);
    }
  }

  String get aspectLabel =>
      kAspectRatios[aspectIndex] == '-1' ? 'Default' : kAspectRatios[aspectIndex];

  Future<void> cycleAspectRatio() async {
    aspectIndex = (aspectIndex + 1) % kAspectRatios.length;
    await _setProperty('video-aspect-override', kAspectRatios[aspectIndex]);
  }

  Future<void> setZoom(double value) async {
    zoom = value;
    await _setProperty('video-zoom', value.toStringAsFixed(2));
  }

  Future<void> rotate() async {
    rotation = (rotation + 90) % 360;
    await _setProperty('video-rotate', rotation.toString());
  }

  // ---- A-B loop ------------------------------------------------------------
  Future<void> toggleAbLoop(Duration position) async {
    final seconds = (position.inMilliseconds / 1000).toStringAsFixed(3);
    if (abLoopStart == null) {
      abLoopStart = position;
      await _setProperty('ab-loop-a', seconds);
    } else if (abLoopEnd == null) {
      abLoopEnd = position;
      await _setProperty('ab-loop-b', seconds);
    } else {
      abLoopStart = null;
      abLoopEnd = null;
      await _setProperty('ab-loop-a', 'no');
      await _setProperty('ab-loop-b', 'no');
    }
  }

  String get abLoopLabel {
    if (abLoopStart == null) return 'A–B';
    if (abLoopEnd == null) return 'A•';
    return 'A•B';
  }

  // ---- Snapshot ------------------------------------------------------------
  Future<String?> snapshot() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final path = '${dir.path}/snapshot_${DateTime.now().millisecondsSinceEpoch}.png';
      await _command(['screenshot-to-file', path, 'video']);
      return path;
    } catch (_) {
      return null;
    }
  }

  Future<void> _setProperty(String name, String value) async {
    final dynamic platform = player.platform;
    if (platform == null) return;
    try {
      await platform.setProperty(name, value);
    } catch (_) {
      // mpv property unavailable on this platform; ignore.
    }
  }

  Future<void> _command(List<String> args) async {
    final dynamic platform = player.platform;
    if (platform == null) return;
    try {
      await platform.command(args);
    } catch (_) {
      // mpv command unavailable on this platform; ignore.
    }
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
