# VisualPlayer for Android (Flutter)

A dedicated native Android player that mirrors the desktop app's core features.
Playback uses **libmpv** via [`media_kit`](https://pub.dev/packages/media_kit),
so it decodes nearly any format — the same engine as the desktop build.

## Features

- Plays almost any video/audio format (libmpv/FFmpeg).
- VLC-style touch gestures: horizontal drag to seek, vertical drag to change
  volume (right) or brightness (left), double-tap a side to skip ±10 s.
- External subtitles (auto-detect siblings of a local file, or pick manually).
- 10-band audio equalizer with presets (built as an mpv `af` filter).
- Chapter navigation, playback speed, playlists (incl. `.m3u`/`.m3u8`).
- Resume from last position, recent-files history.
- Multilingual UI (English, 한국어, 日本語) and light/dark themes.

## Project layout

Only the Dart sources and `pubspec.yaml` are tracked. The native `android/`
scaffold is generated in CI with `flutter create`, then the manifest is
customized (`scripts/flutter-android-manifest.py`) and, when a keystore is
configured, release signing is wired in (`scripts/flutter-android-signing.py`).

## Build locally

```sh
cd app/android
flutter create --org io.github.starfect --project-name visualplayer --platforms=android .
flutter pub get
flutter build apk --release --split-per-abi
```

Per-ABI APKs are written to `build/app/outputs/flutter-apk/`. Release signing is
documented in [`docs/android-signing.md`](../../docs/android-signing.md).
