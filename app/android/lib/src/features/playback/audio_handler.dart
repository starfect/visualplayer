import 'dart:async';

import 'package:audio_service/audio_service.dart';
import 'package:flutter/foundation.dart';
import 'package:media_kit/media_kit.dart';

/// Bridges a media_kit [Player] to the system media session so playback shows
/// a notification / lock-screen controls and continues in the background.
///
/// The player is created per playback screen, so the handler [attach]es to the
/// active player while it is on screen and [detach]es when it leaves. Transport
/// commands coming from the notification are forwarded to the player (play /
/// pause / seek) or back to the screen (skip), and player state is mirrored
/// into [playbackState] so the notification stays in sync.
class VisualAudioHandler extends BaseAudioHandler {
  Player? _player;
  VoidCallback? _onNext;
  VoidCallback? _onPrevious;
  final List<StreamSubscription<dynamic>> _subs = [];

  void attach(
    Player player, {
    required String id,
    required String title,
    String? album,
    Duration? duration,
    VoidCallback? onNext,
    VoidCallback? onPrevious,
  }) {
    detach();
    _player = player;
    _onNext = onNext;
    _onPrevious = onPrevious;
    setMetadata(id: id, title: title, album: album, duration: duration);
    _subs
      ..add(player.stream.playing.listen((_) => _broadcast()))
      ..add(player.stream.position.listen((_) => _broadcast()))
      ..add(player.stream.buffering.listen((_) => _broadcast()))
      ..add(player.stream.duration.listen((d) => _broadcast()))
      ..add(player.stream.rate.listen((_) => _broadcast()));
    _broadcast();
  }

  void setMetadata({
    required String id,
    required String title,
    String? album,
    Duration? duration,
  }) {
    mediaItem.add(MediaItem(id: id, title: title, album: album, duration: duration));
  }

  void detach() {
    for (final sub in _subs) {
      sub.cancel();
    }
    _subs.clear();
    _player = null;
    playbackState.add(PlaybackState(
      processingState: AudioProcessingState.idle,
      playing: false,
    ));
  }

  void _broadcast() {
    final player = _player;
    if (player == null) return;
    final state = player.state;
    playbackState.add(PlaybackState(
      controls: [
        MediaControl.skipToPrevious,
        if (state.playing) MediaControl.pause else MediaControl.play,
        MediaControl.skipToNext,
      ],
      systemActions: const {MediaAction.seek},
      androidCompactActionIndices: const [0, 1, 2],
      processingState:
          state.buffering ? AudioProcessingState.buffering : AudioProcessingState.ready,
      playing: state.playing,
      updatePosition: state.position,
      bufferedPosition: state.buffer,
      speed: state.rate,
    ));
  }

  @override
  Future<void> play() async => _player?.play();

  @override
  Future<void> pause() async => _player?.pause();

  @override
  Future<void> seek(Duration position) async => _player?.seek(position);

  @override
  Future<void> skipToNext() async => _onNext?.call();

  @override
  Future<void> skipToPrevious() async => _onPrevious?.call();

  @override
  Future<void> stop() async {
    await _player?.pause();
    await super.stop();
  }
}
