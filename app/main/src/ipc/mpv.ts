// Thin wrapper over `tauri-plugin-libmpv-api` (BLUEPRINT §4.2).
//
// The libmpv plugin renders video on a GPU surface below the transparent WebView
// and exposes mpv control to JS. This module owns low-level transport (the
// BLUEPRINT §7 player_* operations realized through the plugin) plus property
// observation that feeds the player store. All calls are guarded so the UI still
// renders outside Tauri.

import {
  init,
  command,
  setProperty,
  observeProperties,
  destroy,
  type MpvConfig,
  type MpvObservableProperty,
} from 'tauri-plugin-libmpv-api';

import { inTauri } from './env';
import { playerStore } from '../stores/player';

// Scalar properties pushed to the player store (track-list comes in M2).
const OBSERVED = [
  ['pause', 'flag'],
  ['time-pos', 'double', 'none'],
  ['duration', 'double', 'none'],
  ['filename', 'string', 'none'],
  ['volume', 'double', 'none'],
  ['speed', 'double', 'none'],
  ['sub-text', 'string', 'none'],
] as const satisfies MpvObservableProperty[];

function onProp({ name, data }: { name: string; data: unknown }): void {
  switch (name) {
    case 'pause':
      playerStore.update({ paused: Boolean(data) });
      break;
    case 'time-pos':
      playerStore.update({ timePos: typeof data === 'number' ? data : 0 });
      break;
    case 'duration':
      playerStore.update({ duration: typeof data === 'number' ? data : 0 });
      break;
    case 'filename':
      playerStore.update({ filename: typeof data === 'string' ? data : null });
      break;
    case 'volume':
      if (typeof data === 'number') playerStore.update({ volume: data });
      break;
    case 'speed':
      if (typeof data === 'number') playerStore.update({ speed: data });
      break;
    case 'sub-text':
      playerStore.update({ subText: typeof data === 'string' ? data : '' });
      break;
  }
}

/** Initialize mpv and start observing properties. No-op outside Tauri. */
export async function mpvInit(): Promise<void> {
  if (!inTauri) return;
  const config: MpvConfig = {
    initialOptions: {
      vo: 'gpu-next',
      hwdec: 'auto-safe',
      'media-controls': 'no',
    },
    observedProperties: OBSERVED,
  };
  await init(config);
  await observeProperties(OBSERVED, onProp);
}

/** Tear down mpv (e.g. on window close). */
export async function mpvDestroy(): Promise<void> {
  if (!inTauri) return;
  await destroy();
}

async function cmd(name: string, args: (string | number)[] = []): Promise<void> {
  if (!inTauri) return;
  await command(name, args);
}

async function prop(name: string, value: string | number | boolean): Promise<void> {
  if (!inTauri) return;
  await setProperty(name, value);
}

/** Low-level mpv transport used by the IPC `player` facade. */
export const mpv = {
  loadFile: (url: string) => cmd('loadfile', [url]),
  addSubtitle: (path: string) => cmd('sub-add', [path]),
  play: () => prop('pause', false),
  pause: () => prop('pause', true),
  togglePause: () => cmd('cycle', ['pause']),
  seekRelative: (seconds: number) => cmd('seek', [seconds, 'relative']),
  seekAbsolute: (seconds: number) => cmd('seek', [seconds, 'absolute']),
  setVolume: (volume: number) => prop('volume', Math.round(volume)),
  setSpeed: (speed: number) => prop('speed', speed),
  setAudioTrack: (id: number) => prop('aid', id),
  setSubtitleTrack: (id: number) => prop('sid', id),
  setSubtitleDelay: (seconds: number) => prop('sub-delay', seconds),
  frameStep: () => cmd('frame-step'),
  screenshot: () => cmd('screenshot'),
  stop: () => cmd('stop'),
};
