// Typed IPC facade — the single funnel between the UI and the backend
// (BLUEPRINT §6.2). UI code must call these wrappers, never `invoke` directly.
//
// Low-level mpv transport is realized via the libmpv plugin (see `mpv.ts`); the
// rest are Tauri commands. Together they cover the BLUEPRINT §7 command surface.

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { locale as osLocale } from '@tauri-apps/plugin-os';

import { inTauri } from './env';
import { mpv } from './mpv';
import type {
  LicenseEntry,
  LoadOptions,
  MediaSource,
  Playlist,
  Settings,
  WebVideo,
  YtVideo,
} from './types';

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!inTauri) {
    throw new Error(`IPC '${cmd}' is unavailable outside the Tauri runtime`);
  }
  return invoke<T>(cmd, args);
}

/** Player: source resolution (Rust) + transport (libmpv plugin). */
export const player = {
  /** Resolve a path/URL, load it in mpv, attach discovered subtitles, and play. */
  async load(pathOrUrl: string, options?: LoadOptions): Promise<MediaSource> {
    const source = await call<MediaSource>('player_load', { path: pathOrUrl, options });
    await mpv.loadFile(source.url);
    for (const sub of source.subtitles) {
      await mpv.addSubtitle(sub);
    }
    await mpv.play();
    return source;
  },
  play: () => mpv.play(),
  pause: () => mpv.pause(),
  togglePause: () => mpv.togglePause(),
  stop: () => mpv.stop(),
  seek: (seconds: number, mode: 'relative' | 'absolute' = 'relative') =>
    mode === 'absolute' ? mpv.seekAbsolute(seconds) : mpv.seekRelative(seconds),
  setVolume: (volume: number) => mpv.setVolume(volume),
  setSpeed: (speed: number) => mpv.setSpeed(speed),
  selectTrack: (kind: 'audio' | 'sub', id: number) =>
    kind === 'audio' ? mpv.setAudioTrack(id) : mpv.setSubtitleTrack(id),
  frameStep: () => mpv.frameStep(),
  screenshot: () => mpv.screenshot(),
};

/** Playlist commands; each returns the updated playlist snapshot. */
export const playlist = {
  get: () => call<Playlist>('playlist_get'),
  add: (path: string, title: string | null = null) =>
    call<Playlist>('playlist_add', { path, title }),
  remove: (id: number) => call<Playlist>('playlist_remove', { id }),
  reorder: (from: number, to: number) => call<Playlist>('playlist_reorder', { from, to }),
  select: (id: number) => call<Playlist>('playlist_select', { id }),
};

/** Subtitle: same-name discovery (Rust) + attach/delay (libmpv plugin). */
export const subtitle = {
  discover: (mediaPath: string) => call<string[]>('subtitle_discover', { mediaPath }),
  attach: (subPath: string) => mpv.addSubtitle(subPath),
  setDelay: (seconds: number) => mpv.setSubtitleDelay(seconds),
};

/** Settings commands; each returns the stored settings. */
export const settings = {
  get: () => call<Settings>('settings_get'),
  set: (value: Settings) => call<Settings>('settings_set', { settings: value }),
  setLanguage: (lang: string) => call<Settings>('settings_set_language', { lang }),
};

/** Custom network source resolvers (`.ytvideo` / `.webvideo`). */
export const source = {
  resolveYtVideo: (path: string) => call<YtVideo>('source_resolve_ytvideo', { path }),
  resolveWebVideo: (path: string) => call<WebVideo>('source_resolve_webvideo', { path }),
};

/** System utilities: startup files, licenses, task control. */
export const system = {
  initialFiles: () => call<string[]>('assoc_initial_files'),
  licenses: () => call<LicenseEntry[]>('licenses_list'),
  cancelTask: (taskId: string) => call<void>('task_cancel', { taskId }),
};

/** Open a file picker; returns selected absolute paths (empty if cancelled). */
export async function pickFiles(): Promise<string[]> {
  if (!inTauri) return [];
  const selection = await open({ multiple: true, directory: false });
  if (!selection) return [];
  return Array.isArray(selection) ? selection : [selection];
}

/** Open a folder picker; returns the selected directory path or null. */
export async function pickFolder(): Promise<string | null> {
  if (!inTauri) return null;
  const selection = await open({ multiple: false, directory: true });
  return typeof selection === 'string' ? selection : null;
}

/** Detect the OS locale for i18n auto-selection (BLUEPRINT §6.3). */
export async function detectOsLocale(): Promise<string | null> {
  if (!inTauri) {
    return typeof navigator !== 'undefined' ? navigator.language : null;
  }
  try {
    return await osLocale();
  } catch {
    return null;
  }
}
