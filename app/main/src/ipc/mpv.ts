// Wrapper over `tauri-plugin-libmpv-api`: low-level mpv transport plus the rich
// VLC-style control surface (video filters, tracks, A-B loop, media info).

import type { MpvConfig, MpvFormat, MpvObservableProperty } from 'tauri-plugin-libmpv-api';

import { inTauri } from './env';
import { selectTransport, type PlaybackTransport } from './transport';
import { playerStore } from '../stores/player';
import { chaptersStore } from '../features/chapters/store';
import type { MediaInfo, TrackInfo } from './types';

const OBSERVED = [
  ['pause', 'flag'],
  ['mute', 'flag'],
  ['time-pos', 'double', 'none'],
  ['duration', 'double', 'none'],
  ['filename', 'string', 'none'],
  ['volume', 'double', 'none'],
  ['speed', 'double', 'none'],
  ['sub-text', 'string', 'none'],
  ['chapter', 'int64', 'none'],
  ['chapters', 'int64', 'none'],
] as const satisfies MpvObservableProperty[];

function onProp({ name, data }: { name: string; data: unknown }): void {
  switch (name) {
    case 'pause':
      playerStore.update({ paused: Boolean(data) });
      break;
    case 'mute':
      playerStore.update({ muted: Boolean(data) });
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
    case 'chapter':
      chaptersStore.update({ current: typeof data === 'number' ? data : -1 });
      break;
    case 'chapters':
      chaptersStore.update({ count: typeof data === 'number' ? data : 0 });
      break;
  }
}

let transport: PlaybackTransport | null = null;

export async function mpvInit(hwdec: boolean): Promise<void> {
  if (!inTauri) return;
  transport = await selectTransport();
  const config: MpvConfig = {
    initialOptions: {
      vo: 'gpu-next',
      hwdec: hwdec ? 'auto-safe' : 'no',
      'media-controls': 'no',
      'keep-open': 'yes',
    },
    observedProperties: OBSERVED,
  };
  await transport.init(config, onProp);
}

export async function mpvDestroy(): Promise<void> {
  if (transport) await transport.destroy();
}

async function cmd(name: string, args: (string | number)[] = []): Promise<void> {
  if (transport) await transport.command(name, args);
}

async function prop(name: string, value: string | number | boolean): Promise<void> {
  if (transport) await transport.setProperty(name, value);
}

async function getProp<T>(name: string, format: MpvFormat): Promise<T | null> {
  if (!transport) return null;
  try {
    return (await transport.getProperty(name, format)) as T;
  } catch {
    return null;
  }
}

interface RawTrack {
  id: number;
  type: string;
  title?: string;
  lang?: string;
  selected?: boolean;
  codec?: string;
}

export const mpv = {
  loadFile: (url: string) => cmd('loadfile', [url]),
  addSubtitle: (path: string) => cmd('sub-add', [path]),
  stop: () => cmd('stop'),

  play: () => prop('pause', false),
  pause: () => prop('pause', true),
  togglePause: () => cmd('cycle', ['pause']),
  seekRelative: (seconds: number) => cmd('seek', [seconds, 'relative']),
  seekAbsolute: (seconds: number) => cmd('seek', [seconds, 'absolute']),
  frameStep: () => cmd('frame-step'),
  frameBackStep: () => cmd('frame-back-step'),
  screenshot: () => cmd('screenshot'),

  setVolume: (v: number) => prop('volume', Math.round(v)),
  setMute: (m: boolean) => prop('mute', m),
  toggleMute: () => cmd('cycle', ['mute']),
  setSpeed: (s: number) => prop('speed', s),

  setAspect: (ratio: string) => prop('video-aspect-override', ratio),
  setRotate: (deg: number) => prop('video-rotate', ((deg % 360) + 360) % 360),
  setZoom: (zoom: number) => prop('video-zoom', zoom),
  setPan: (x: number, y: number) => Promise.all([prop('video-pan-x', x), prop('video-pan-y', y)]),
  setDeinterlace: (on: boolean) => prop('deinterlace', on),
  setBrightness: (v: number) => prop('brightness', clampEq(v)),
  setContrast: (v: number) => prop('contrast', clampEq(v)),
  setGamma: (v: number) => prop('gamma', clampEq(v)),
  setSaturation: (v: number) => prop('saturation', clampEq(v)),
  setHue: (v: number) => prop('hue', clampEq(v)),

  setAudioTrack: (id: number | 'no') => prop('aid', id),
  cycleAudioTrack: () => cmd('cycle', ['audio']),
  setAudioDelay: (seconds: number) => prop('audio-delay', seconds),

  setSubtitleTrack: (id: number | 'no') => prop('sid', id),
  cycleSubtitle: () => cmd('cycle', ['sub']),
  setSubtitleVisibility: (on: boolean) => prop('sub-visibility', on),
  setSubtitleDelay: (seconds: number) => prop('sub-delay', seconds),
  setSubtitleScale: (scale: number) => prop('sub-scale', scale),
  setSubtitlePos: (pos: number) => prop('sub-pos', pos),
  setSubtitleColor: (color: string) => prop('sub-color', color),
  setSubtitleFontSize: (size: number) => prop('sub-font-size', size),

  setAbLoopA: (t: number | 'no') => prop('ab-loop-a', t),
  setAbLoopB: (t: number | 'no') => prop('ab-loop-b', t),
  setLoopFile: (on: boolean) => prop('loop-file', on ? 'inf' : 'no'),

  setAudioFilter: (value: string) => prop('af', value),
  addChapter: (delta: number) => cmd('add', ['chapter', delta]),
  setChapter: (index: number) => prop('chapter', index),
  async chapterList(): Promise<{ title: string | null; time: number }[]> {
    const raw = (await getProp<{ title?: string; time?: number }[]>('chapter-list', 'node')) ?? [];
    return raw.map((c) => ({ title: c.title ?? null, time: c.time ?? 0 }));
  },

  async mediaInfo(): Promise<MediaInfo> {
    const raw = (await getProp<RawTrack[]>('track-list', 'node')) ?? [];
    const tracks: TrackInfo[] = raw.map((t) => ({
      id: t.id,
      type: (t.type as TrackInfo['type']) ?? 'video',
      title: t.title,
      lang: t.lang,
      selected: Boolean(t.selected),
      codec: t.codec,
    }));
    return {
      filename: await getProp<string>('filename', 'string'),
      durationSeconds: (await getProp<number>('duration', 'double')) ?? 0,
      width: (await getProp<number>('width', 'int64')) ?? 0,
      height: (await getProp<number>('height', 'int64')) ?? 0,
      videoCodec: await getProp<string>('video-codec', 'string'),
      audioCodec: await getProp<string>('audio-codec', 'string'),
      fps: await getProp<number>('container-fps', 'double'),
      tracks,
    };
  },
};

function clampEq(v: number): number {
  return Math.max(-100, Math.min(100, Math.round(v)));
}
