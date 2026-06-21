<div align="center">

# VisualPlayer

<img src="resources/icon.svg" alt="VisualPlayer" width="120" />

**A lightweight, non-profit, cross-platform media player.**

`Rust · Tauri 2 · Swift` ｜ `Windows · macOS · Linux · Android · iOS`

</div>

---

VisualPlayer plays nearly any video/audio format from a single codebase
(desktop + Android share one project; iOS is a separate Swift app). It is a
**non-profit open-source** project. See [`BLUEPRINT.md`](./BLUEPRINT.md) — the
single source of truth for design and scope.

## Highlights

- **Broad format support** — playback engine is **mpv (libmpv)**, which embeds
  FFmpeg, covering practically every container/codec in the spec.
- **Multiple playback** — play several videos in sequence or simultaneously.
- **Auto subtitles** — generate subtitles locally with Whisper (no upload).
- **Custom formats** — `.ytvideo`, `.webvideo`, `.{media}.torrent` open by
  double-click (download-only torrents).
- **i18n** — default language English; multilingual UI (`en`, `ko`, …).

## Repository layout

```
vp-core/                  Pure-Rust core logic (no Tauri/mpv deps; unit-tested)
app/main/                 Tauri 2 project (desktop + Android)
  src/                    Frontend — Vite + Vanilla TypeScript (no UI framework)
  src-tauri/              Rust backend (Tauri shell: player, IPC, file assoc)
app/ios/                  iOS Swift app (deferred; not in this build)
installer/                Windows NSIS installer customization
licenses/                 Third-party license texts (collected for distribution)
.github/workflows/        CI + release pipelines
BLUEPRINT.md              Design single-source-of-truth
CLAUDE.md                 Compressed context for AI agents
```

> **Architecture note:** the backend is a Cargo **workspace**. Pure logic lives
> in the dependency-free `vp-core` crate so it can be unit-tested without native
> libraries; `app/main/src-tauri` is the Tauri binary that adds the libmpv glue
> and IPC. This refines BLUEPRINT §5 (module names/responsibilities unchanged).

## Development

Prerequisites: Rust (stable), Node.js (LTS), and the platform Tauri
prerequisites. Native playback needs **mpv/libmpv** installed.

```bash
# Linux build deps (Debian/Ubuntu)
sudo apt-get install -y libwebkit2gtk-4.1-dev libmpv-dev build-essential \
    curl wget file libssl-dev libgtk-3-dev librsvg2-dev

# macOS
brew install mpv

# Run the pure-core tests (no native deps required)
cargo test -p vp-core

# Desktop dev (frontend + Tauri shell)
cd app/main
npm install
npm run tauri dev

# Release build
npm run tauri build

# Android (after `tauri android init`; requires Android SDK/NDK)
npm run tauri android dev
```

- **libmpv:** on Windows `tauri-plugin-libmpv` downloads the DLL automatically;
  on macOS/Linux install system mpv (`brew install mpv` / distro package).
- **Sidecars:** FFmpeg (GPL full build) and yt-dlp are bundled as Tauri external
  binaries at build time (later milestones).

## Status

This repository currently implements **M1 (MVP foundation)**: project scaffold,
compiling Tauri shell, libmpv playback integration, basic controls UI, core IPC,
i18n (en/ko), and design tokens. Later milestones (playlist UX, auto subtitles,
conversion, network/torrent sources, installer, mobile) are scaffolded as typed
stubs. See the roadmap in `BLUEPRINT.md` §19.

## License

- **Own source code:** Apache-2.0 (see [`LICENSE.md`](./LICENSE.md)).
- **Distributed binaries:** include GPL components (full-build FFmpeg, GPL mpv),
  so the combined binary is distributed under **GPLv3** (see [`COPYING`](./COPYING)).
  Corresponding source is this public repository. Details in `BLUEPRINT.md` §18.

© 2026 starfect · non-profit open source.
