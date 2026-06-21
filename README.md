<div align="center">

# VisualPlayer

<img src="resources/icon.svg" alt="VisualPlayer" width="112" />

**A lightweight, non-profit, cross-platform media player that plays almost everything.**

`Rust · Tauri 2 · Swift` ｜ `Windows · macOS · Linux · Android · iOS`

English ｜ [한국어](./README.ko.md) ｜ [日本語](./README.ja.md)

</div>

---

VisualPlayer plays nearly any video/audio format using **mpv (libmpv, FFmpeg
inside)**, with multiple playback, automatic same-name subtitles, torrent / web /
YouTube link files, keyboard shortcuts, and touch gestures. It is **free and open
source**.

## Table of contents

- [Install](#install)
- [Getting started](#getting-started)
- [Playback controls](#playback-controls)
- [Subtitles](#subtitles)
- [Adjustments (VLC-style)](#adjustments-vlc-style)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Touch gestures (mobile)](#touch-gestures-mobile)
- [Custom file formats](#custom-file-formats)
- [Set as default player](#set-as-default-player)
- [Settings](#settings)
- [Build from source](#build-from-source)
- [License](#license)

## Install

Download the asset for your platform from the [latest release](../../releases/latest):

| Platform | File |
| --- | --- |
| Windows 10/11 (x64, Arm64) | `VisualPlayer-Setup-*.exe` (custom installer) |
| macOS (Apple Silicon / Intel) | `.dmg` |
| Linux | `.deb` / `.rpm` / `.AppImage` |
| Android | `.apk` |

- **Windows:** run `VisualPlayer-Setup-*.exe`, choose folder/shortcuts/associations,
  click Install. Self-contained installer (no NSIS); uninstall from Add/Remove Programs.
- **macOS:** drag to Applications; first launch → right-click → **Open**.
- **Linux:** install the package, or `chmod +x *.AppImage && ./VisualPlayer.AppImage`.
  Needs system `libmpv` + WebKitGTK.
- **Android:** enable install from source, open the `.apk`.

## Getting started

1. **Open media** — drag & drop files onto the window, or click the **folder**
   button (top-right) / **Open file** on the welcome screen.
2. Drop **multiple files** to queue them — the first plays, the rest join the
   playlist (open it with the **list** button or `Tab`).
3. Playback **resumes** from your last position automatically (toggle in Settings).

Supported containers include mp4, mkv, avi, mov, wmv, flv, webm, m4v, ts, m2ts,
mpg, vob, and many more; audio includes mp3, aac, flac, opus, ogg, wav, m4a, wma,
alac, and others.

## Playback controls

The control bar (auto-hides during playback, move the mouse to show it):

- Play/pause, previous/next, seek bar with time, volume + mute, playback speed.
- **Subtitle** button cycles subtitle tracks.
- **Adjustments** button opens the video/audio tools panel.
- **Screenshot**, **Playlist**, **Settings**, and **Fullscreen** buttons.

## Subtitles

- **Automatic** — when you open `movie.mkv`, VisualPlayer attaches a sibling
  `movie.srt`, `movie.ass`, `movie.en.srt`, etc. in the same folder.
- **Manual / embedded** — cycle tracks with the subtitle button or `c`.
- **Sync & style** — adjust **subtitle delay** in the Adjustments panel (`g`/`h`),
  and **size** in Settings.

## Adjustments (VLC-style)

Open the **Adjustments** panel for:

- **Video:** aspect ratio, rotate, zoom in/out/reset, deinterlace.
- **Color equalizer:** brightness, contrast, gamma, saturation, hue (+ reset).
- **Audio:** track cycling and **audio delay** (`Shift+G`/`Shift+H`).
- **Subtitles:** track cycling and delay.
- **A-B repeat:** mark A, then B to loop a segment (`r`).
- **Media info:** resolution, codecs, frame rate, track count.

## Keyboard shortcuts

| Action | Keys |
| --- | --- |
| Play / pause | `Space`, `k` |
| Seek ±5s / ±60s | `←` `→` / `Shift+←` `Shift+→` (also `j` `l`) |
| Frame step | `.` / `,` |
| Volume up / down / mute | `↑` / `↓` / `m` |
| Fullscreen / exit | `f` / `Esc` |
| Speed up / down / reset | `]` / `[` / `Backspace` |
| Previous / next item | `p` / `n` |
| Screenshot | `s` |
| Subtitle / audio cycle | `c` / `b` |
| Subtitle delay − / + | `g` / `h` |
| Audio delay − / + | `Shift+G` / `Shift+H` |
| Playlist / settings | `Tab` / `Ctrl+,` |
| A-B repeat | `r` |
| Aspect / rotate | `a` / `Ctrl+R` |
| Zoom in / out / reset | `=` / `-` / `0` |
| Jump start / end | `Home` / `End` |

The full, live list is shown in **Settings → Keyboard shortcuts**.

## Touch gestures (mobile)

On Android (and iOS), over the video:

- **Swipe horizontally** — seek (a label shows the target time).
- **Swipe vertically, right half** — volume.
- **Swipe vertically, left half** — screen brightness.
- **Double-tap left / right** — skip −10s / +10s.

Gestures can be toggled in **Settings → Touch gestures**.

## Custom file formats

- **`.{video}.torrent` + `.{subtitle}.torrent`** — open the video torrent; if a
  same-name subtitle torrent is beside it (e.g. `movie.mp4.torrent` and
  `movie.srt.torrent`), both download and the subtitle is attached. Download-only.
- **`.webvideo`** — a direct media URL (one line), or TOML with `url` and optional
  `headers`.
- **`.ytvideo`** — a YouTube link (one line), or TOML with `url`,
  `preferred_resolution`, `title`.

Double-click any of these to play.

## Set as default player

**Settings → Set as default player** registers VisualPlayer as the default handler
for all supported video, audio, and subtitle types (uses your OS mechanism;
on Windows it opens the Default Apps screen).

## Settings

Language (English / 한국어 / 日本語), theme (system/light/dark), resume,
hardware decoding, autoplay next, subtitle auto-load & size, gestures, default-app
registration, the shortcut list, and version info.

## Build from source

Prerequisites: Rust (stable), Node.js (LTS), and your platform's Tauri
prerequisites. Native playback needs **mpv/libmpv**.

```bash
# Linux build deps (Debian/Ubuntu)
sudo apt-get install -y libwebkit2gtk-4.1-dev libmpv-dev librsvg2-dev libgtk-3-dev

# macOS
brew install mpv

# Pure-core tests (no native deps required)
cargo test -p vp-core

# Desktop dev / build
cd app/main
npm install
npm run tauri dev
npm run tauri build               # add `-- --features torrent` for torrent support

# Android (requires Android SDK/NDK)
npm run tauri android init
npm run tauri android build
```

The backend is a Cargo **workspace**: `vp-core` holds dependency-free, unit-tested
logic; `app/main/src-tauri` is the Tauri binary. The frontend is **Vite + Vanilla
TypeScript** (no UI framework). iOS is a separate Swift app in [`app/ios`](./app/ios).

## License

- **Own source code:** Apache-2.0 ([`LICENSE.md`](./LICENSE.md)).
- **Distributed binaries:** include GPL components (full-build FFmpeg, mpv), so the
  combined binary is **GPLv3** ([`COPYING`](./COPYING)). Corresponding source is
  this repository; third-party licenses are viewable in-app.

© 2026 starfect · non-profit open source.
