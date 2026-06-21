# VisualPlayer installer (real Tauri app — no NSIS)

A standalone **Tauri** application that installs and uninstalls VisualPlayer with
a native wizard UI (welcome → license → options → progress → done). It does the
real work in Rust — no dependency on NSIS.

## What it does

- Copies the bundled `payload/` (the VisualPlayer build) to the chosen location
  (default: per-user app dir).
- Creates shortcuts:
  - **Linux:** `.desktop` entries in `~/.local/share/applications` and the Desktop.
  - **Windows:** Start Menu + Desktop `.lnk` (via `mslnk`) and an Add/Remove
    Programs entry (via `winreg`).
  - **macOS:** copies the app into `/Applications`.
- Optionally registers VisualPlayer as the default media/subtitle handler.
- Writes an uninstall manifest, so removal is exact and reversible.

## Uninstall

- From the installer UI (it detects an existing install and offers **Uninstall**).
- Headless: `visualplayer-installer --uninstall` (this is the `UninstallString`
  registered on Windows).

## Layout

```
installer/
  src/                installer wizard UI (Vite + Vanilla TS)
  src-tauri/
    src/lib.rs         Tauri commands (info / install / uninstall / launch)
    src/install.rs     real install/uninstall logic (copy, shortcuts, registry)
    payload/           VisualPlayer files to install (filled at packaging time)
```

## Build

```bash
# 1) Build the player and copy its bundle into installer/src-tauri/payload/
cd app/main && npm run tauri build

# 2) Build the installer
cd ../../installer && npm install && npm run tauri build
```
