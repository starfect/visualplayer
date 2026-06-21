# VisualPlayer for iOS (Swift)

Standalone SwiftUI app (no code shared with the desktop/Android Tauri project).
Playback uses **AVPlayer** for native formats and **VLCKit** for the long tail of
containers/codecs. It is built locally with Xcode and is intentionally excluded
from GitHub Actions.

## Features

- Local video/audio playback (AVPlayer + VLCKit)
- Same-name external subtitle auto-attach (`movie.mkv` → `movie.srt`)
- `.webvideo` / `.ytvideo` link files (open in place / share sheet)
- VLC-style touch gestures: horizontal swipe seeks, vertical swipe sets
  volume (right) or screen brightness (left), double-tap skips ±10s
- Playlist, playback speed, resume, light/dark theme, EN/KO/JA localization

## Project layout

```
app/ios/
  project.yml                 XcodeGen spec (generates VisualPlayer.xcodeproj)
  VisualPlayer/
    App.swift                 @main entry, scene + onOpenURL
    ContentView.swift         Player stage, controls overlay, importers
    Models/MediaItem.swift    Media item + type classification
    Stores/LibraryStore.swift Playlist + current selection + repeat/shuffle
    Services/                 SubtitleFinder, SourceResolver (.webvideo/.ytvideo)
    Player/                   Engine protocol, AVPlayer & VLC engines, surface,
                              controls, gestures, view model
    Settings/                 SettingsStore + SettingsView
    Playlist/PlaylistView.swift
    Resources/                Info.plist, Localizable.xcstrings (EN/KO/JA)
```

## Build (local, macOS + Xcode)

```bash
brew install xcodegen          # one-time
cd app/ios
xcodegen generate              # creates VisualPlayer.xcodeproj from project.yml
open VisualPlayer.xcodeproj    # then set your signing team and Run
```

`project.yml` declares the VLCKit Swift Package dependency; Xcode resolves it on
first open. If VLCKit is unavailable, the app still builds and falls back to
AVPlayer (the VLC engine is guarded by `#if canImport(VLCKit)`).

> App icon: `resources/app.png` (repository root).
