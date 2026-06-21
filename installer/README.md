# Windows installer customization

VisualPlayer uses Tauri's bundler with **NSIS** for the Windows installer
(BLUEPRINT §14). This directory holds NSIS customization hooks.

## Flow (§14.1)

```
[Start] → [License agreement] → [Install] → [Extra settings] → [Done]
```

- The **License agreement** page is the NSIS license page.
- **Extra settings** is a custom NSIS component page.
- Brand color: `#0040FF`.

## Files

- `hooks.nsh` — NSIS hook macros (`.onInit`, custom pages, branding). Wire it in
  `tauri.conf.json` via `bundle.windows.nsis.installerHooks` when implementing M5.
- Third-party license files (from `../licenses/`) are placed in the install dir
  (`licenses/`) at install time (§18.2).

> If NSIS theming is insufficient for the flat "Flutter-like" design, a small
> custom installer (lightweight Tauri/native app) is the documented fallback (§14.2).

This is a placeholder for milestone **M5**; no functional NSIS script is wired
into the bundle yet.
