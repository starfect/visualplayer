import 'package:flutter/material.dart';

import '../../core/models.dart';
import '../bookmarks/bookmarks.dart';
import '../history/history.dart';
import '../settings/settings.dart';
import 'audio_handler.dart';
import 'player_screen.dart';

/// Opens [queue] at [index] in the full-screen player. Both audio and video go
/// through the same media_kit-backed player.
Future<void> playMedia(
  BuildContext context,
  List<MediaItem> queue,
  int index, {
  required History history,
  required Settings settings,
  required Bookmarks bookmarks,
  required VisualAudioHandler audioHandler,
}) {
  if (queue.isEmpty) return Future<void>.value();
  return Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => PlayerScreen(
        queue: queue,
        index: index,
        history: history,
        settings: settings,
        bookmarks: bookmarks,
        audioHandler: audioHandler,
      ),
    ),
  );
}
