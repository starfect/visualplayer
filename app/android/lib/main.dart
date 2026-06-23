import 'package:audio_service/audio_service.dart';
import 'package:flutter/widgets.dart';
import 'package:media_kit/media_kit.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'src/app.dart';
import 'src/features/bookmarks/bookmarks.dart';
import 'src/features/history/history.dart';
import 'src/features/playback/audio_handler.dart';
import 'src/features/settings/settings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final audioHandler = await AudioService.init(
    builder: VisualAudioHandler.new,
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'dev.starfect.visualplayer.playback',
      androidNotificationChannelName: 'Playback',
      androidNotificationOngoing: true,
      androidStopForegroundOnPause: true,
    ),
  );
  runApp(VisualPlayerApp(
    settings: Settings(prefs),
    history: History(prefs),
    bookmarks: Bookmarks(prefs),
    audioHandler: audioHandler,
  ));
}
