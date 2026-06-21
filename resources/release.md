# VisualPlayer

A lightweight, non-profit, cross-platform media player that plays **almost every**
video and audio format using the mpv/FFmpeg engine — with multiple playback,
automatic same-name subtitles, torrent/web/YouTube link files, keyboard shortcuts,
and touch gestures. Free and open source.

> Versioning is automatic: each push bumps the version based on how many files
> changed (≤10 → patch, ≥11 → minor, minor rollover at 10 or ≥70 files → major).

---

## ✨ Highlights

- **Plays everything** — mkv, mp4, avi, mov, webm, ts, flac, opus, and dozens more,
  decoded by libmpv (FFmpeg inside). No codec packs required.
- **Subtitles, done right** — same-name subtitles (`movie.mkv` → `movie.srt`,
  `movie.en.srt`) attach automatically; adjust delay, size, and track on the fly.
- **Torrent with paired subtitles** — open `movie.mp4.torrent` and, if a
  `movie.srt.torrent` sits beside it, both are fetched and the subtitle is attached
  to the video. Download-only (no seeding).
- **Web & YouTube links** — `.webvideo` and `.ytvideo` files open and play.
- **VLC/PotPlayer-grade controls** — aspect ratio, rotation, zoom, deinterlace,
  color equalizer (brightness/contrast/gamma/saturation/hue), audio & subtitle
  delay, A-B repeat, frame stepping, screenshots, playback speed, media info.
- **10-band audio equalizer** — pre-amp plus presets (Rock, Pop, Jazz, Classical,
  Dance, Bass/Treble boost, Vocal, Soft); toggle with `e`.
- **Chapter navigation** — jump between embedded chapters (`PageUp`/`PageDown`)
  or pick from the list.
- **Playlists** — open and save `.m3u`/`.m3u8` files.
- **Mini-player** — a compact, always-on-top window (`t`).
- **Keyboard shortcuts** — space/k play, j/l/←/→ seek, ↑/↓ volume, f fullscreen,
  `[`/`]` speed, and many more (fully listed in Settings).
- **Touch gestures (mobile)** — swipe horizontally to seek, vertically to change
  volume (right) or brightness (left), double-tap to skip ±10 s.
- **Resume & history** — continue from where you left off.
- **Set as default player** — one button hands all video/audio/subtitle files to
  VisualPlayer.
- **Multilingual UI** — English, 한국어, 日本語 (more via locale files).
- **Minimal, distraction-free design** with light/dark themes.

---

## 📦 Downloads

Pick the asset for your platform from the **Assets** list below.

| Platform | File |
| --- | --- |
| Windows 10/11 (x64, Arm64) | `VisualPlayer-Setup-*.exe` (custom installer, no NSIS) |
| macOS (Apple Silicon / Intel) | `.dmg` |
| Linux (Debian/Ubuntu) | `.deb` |
| Linux (Fedora/RHEL) | `.rpm` |
| Linux (portable) | `.AppImage` |
| Android (arm64 / x86_64) | `.apk` |

> iOS is a separate Swift app, built locally with Xcode (not distributed here).

### Install notes

- **Windows:** run `VisualPlayer-Setup-*.exe`, pick the install folder, shortcuts,
  and file associations, then click Install. It is a single self-contained
  installer (no NSIS); uninstall from Add/Remove Programs.
- **macOS:** open the `.dmg` and drag VisualPlayer to Applications. On first launch,
  right-click → Open (the build may be unsigned).
- **Linux:** install the `.deb`/`.rpm`, or `chmod +x` the AppImage and run it.
  Requires system `libmpv` and WebKitGTK.
- **Android:** allow installation from the source, then open the `.apk`. On
  mobile, playback runs through the device's native media engine (system
  WebView), so the supported formats are the platform's rather than the full
  desktop mpv set.

---

## 🔒 Privacy & legality

- Automatic subtitles (Whisper) run **fully locally** — nothing is uploaded.
- Torrents are **download-only** with transport encryption; they are not anonymous
  by themselves. You are responsible for the legality of the content you open.

## 📄 License

Own source code is Apache-2.0; distributed binaries include GPL components
(full-build FFmpeg, mpv) and are therefore released under **GPLv3**. Corresponding
source is this repository. Third-party licenses are viewable in-app.

© 2026 starfect · non-profit open source.
