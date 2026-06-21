// Playback transport abstraction. Desktop uses the libmpv plugin; mobile (and
// plain-browser dev) use an HTML5 <video> element backed by the platform's
// native media pipeline. Both expose the same mpv-style command/property surface
// so the entire control layer in `./mpv` stays backend-agnostic.

import { platform } from '@tauri-apps/plugin-os';
import type { MpvConfig, MpvFormat } from 'tauri-plugin-libmpv-api';

import { inTauri } from './env';
import { libmpvTransport } from './backends/libmpv';
import { htmlVideoTransport } from './backends/htmlVideo';

export type PropCallback = (event: { name: string; data: unknown }) => void;

export interface PlaybackTransport {
  init(config: MpvConfig, onProp: PropCallback): Promise<void>;
  command(name: string, args: (string | number)[]): Promise<void>;
  setProperty(name: string, value: string | number | boolean): Promise<void>;
  getProperty(name: string, format: MpvFormat): Promise<unknown>;
  destroy(): Promise<void>;
}

export async function selectTransport(): Promise<PlaybackTransport> {
  if (!inTauri) return htmlVideoTransport;
  try {
    const os = platform();
    if (os === 'android' || os === 'ios') return htmlVideoTransport;
  } catch {
    /* fall back to libmpv on desktop */
  }
  return libmpvTransport;
}
