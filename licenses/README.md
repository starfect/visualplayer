# Third-party licenses

This directory collects the **verbatim license texts** of every program and
library distributed with VisualPlayer (BLUEPRINT §18.2). At build/packaging
time these files are placed alongside the installed binaries, and the in-app
"Licenses" screen lists them via the `licenses_list` command.

## What goes here

One file (or subdirectory) per component, e.g.:

| Component | Role | License |
| --- | --- | --- |
| FFmpeg (full/GPL build) | demux/decode/convert | GPLv2-or-later (treated as GPLv3) |
| mpv / libmpv | playback engine | GPLv2-or-later / LGPL parts |
| x264, x265 | encoders (convert) | GPLv2-or-later |
| librqbit | torrent (download-only) | Apache-2.0 / MIT |
| whisper.cpp / whisper-rs | local subtitles | MIT |
| yt-dlp | YouTube extraction (sidecar) | Unlicense / public domain |
| Tauri, wry, tao | app framework | Apache-2.0 / MIT |

> Files are **collected at packaging time** (or downloaded with their components)
> and are intentionally not all committed here yet. Add the actual `LICENSE`
> text files as each dependency is wired in (see milestones in BLUEPRINT §19).

## Distribution obligation

For GPL compliance, the application and installers also point users to the
**Corresponding Source** (this public repository). See `../COPYING`.
