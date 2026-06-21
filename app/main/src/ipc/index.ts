// Typed IPC facade — the single funnel between the UI and the backend. Low-level
// mpv transport is realized through `./mpv`; the rest are Tauri commands.

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { locale as osLocale } from '@tauri-apps/plugin-os';

import { inTauri } from './env';
import { mpv } from './mpv';
import type {
  AppInfo,
  Binding,
  History,
  LicenseEntry,
  LoadOptions,
  MediaInfo,
  MediaSource,
  Playlist,
  Settings,
  TorrentPlan,
  TorrentResolution,
  WebVideo,
  YtVideo,
} from './types';

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!inTauri) throw new Error(`IPC '${cmd}' is unavailable outside the Tauri runtime`);
  return invoke<T>(cmd, args);
}

export const player = {
  async load(pathOrUrl: string, options?: LoadOptions): Promise<MediaSource> {
    const source = await call<MediaSource>('player_load', { path: pathOrUrl, options });
    await mpv.loadFile(source.url);
    for (const sub of source.subtitles) await mpv.addSubtitle(sub);
    await mpv.play();
    return source;
  },
  play: () => mpv.play(),
  pause: () => mpv.pause(),
  togglePause: () => mpv.togglePause(),
  stop: () => mpv.stop(),
  seek: (seconds: number, mode: 'relative' | 'absolute' = 'relative') =>
    mode === 'absolute' ? mpv.seekAbsolute(seconds) : mpv.seekRelative(seconds),
  setVolume: (v: number) => mpv.setVolume(v),
  toggleMute: () => mpv.toggleMute(),
  setSpeed: (s: number) => mpv.setSpeed(s),
  frameStep: () => mpv.frameStep(),
  frameBackStep: () => mpv.frameBackStep(),
  screenshot: () => mpv.screenshot(),
  selectTrack: (kind: 'audio' | 'sub', id: number | 'no') =>
    kind === 'audio' ? mpv.setAudioTrack(id) : mpv.setSubtitleTrack(id),
  mediaInfo: (): Promise<MediaInfo> => mpv.mediaInfo(),
};

export const playlist = {
  get: () => call<Playlist>('playlist_get'),
  add: (path: string, title: string | null = null) =>
    call<Playlist>('playlist_add', { path, title }),
  remove: (id: number) => call<Playlist>('playlist_remove', { id }),
  reorder: (from: number, to: number) => call<Playlist>('playlist_reorder', { from, to }),
  select: (id: number) => call<Playlist>('playlist_select', { id }),
};

export const subtitle = {
  discover: (mediaPath: string) => call<string[]>('subtitle_discover', { mediaPath }),
  attach: (subPath: string) => mpv.addSubtitle(subPath),
  setDelay: (seconds: number) => mpv.setSubtitleDelay(seconds),
};

export const settings = {
  get: () => call<Settings>('settings_get'),
  set: (value: Settings) => call<Settings>('settings_set', { settings: value }),
  setLanguage: (lang: string) => call<Settings>('settings_set_language', { lang }),
  defaultKeybindings: () => call<Binding[]>('settings_default_keybindings'),
};

export const source = {
  resolveYtVideo: (path: string) => call<YtVideo>('source_resolve_ytvideo', { path }),
  resolveWebVideo: (path: string) => call<WebVideo>('source_resolve_webvideo', { path }),
};

export const torrent = {
  plan: (path: string) => call<TorrentPlan>('torrent_plan', { path }),
  open: (path: string) => call<TorrentResolution>('torrent_open', { path }),
};

export const history = {
  get: () => call<History>('history_get'),
  record: (path: string, title: string | null, position: number, duration: number) =>
    call<void>('history_record', { path, title, position, duration }),
  resumePosition: (path: string) => call<number | null>('history_resume_position', { path }),
  remove: (path: string) => call<History>('history_remove', { path }),
  clear: () => call<void>('history_clear'),
};

export const assoc = {
  initialFiles: () => call<string[]>('assoc_initial_files'),
  registerDefaults: () => call<string>('assoc_register_default_handler'),
};

export const system = {
  licenses: () => call<LicenseEntry[]>('licenses_list'),
  cancelTask: (taskId: string) => call<void>('task_cancel', { taskId }),
  appInfo: () => call<AppInfo>('app_info'),
};

export async function pickFiles(): Promise<string[]> {
  if (!inTauri) return [];
  const selection = await open({ multiple: true, directory: false });
  if (!selection) return [];
  return Array.isArray(selection) ? selection : [selection];
}

export async function pickFolder(): Promise<string | null> {
  if (!inTauri) return null;
  const selection = await open({ multiple: false, directory: true });
  return typeof selection === 'string' ? selection : null;
}

export async function detectOsLocale(): Promise<string | null> {
  if (!inTauri) return typeof navigator !== 'undefined' ? navigator.language : null;
  try {
    return await osLocale();
  } catch {
    return null;
  }
}
