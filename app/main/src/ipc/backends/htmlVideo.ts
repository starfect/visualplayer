// Mobile/browser playback transport: an HTML5 <video> element driven through the
// same mpv-style command/property API. The Android System WebView decodes media
// with the platform's native pipeline, so this is the on-device player engine.
//
// mpv concepts without a <video> equivalent (video filters, the audio equalizer,
// aspect/zoom/rotation, audio/subtitle delay, chapters) are accepted and ignored
// so the shared control layer never has to special-case the backend.

import { convertFileSrc } from '@tauri-apps/api/core';

import { inTauri } from '../env';
import type { PlaybackTransport, PropCallback } from '../transport';

let element: HTMLVideoElement | null = null;
let notify: PropCallback = () => {};

function video(): HTMLVideoElement {
  if (element) return element;
  const v = document.createElement('video');
  v.className = 'html-video';
  v.setAttribute('playsinline', '');
  v.controls = false;
  (document.querySelector('.video-stage') ?? document.body).appendChild(v);
  element = v;
  return v;
}

function toSource(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return url;
  return inTauri ? convertFileSrc(url) : url;
}

function duration(v: HTMLVideoElement): number {
  return Number.isFinite(v.duration) ? v.duration : 0;
}

function setSubtitleVisibility(on: boolean): void {
  const tracks = video().textTracks;
  for (let i = 0; i < tracks.length; i += 1) tracks[i].mode = on ? 'showing' : 'hidden';
}

function addSubtitle(path: string): void {
  const v = video();
  const track = document.createElement('track');
  track.kind = 'subtitles';
  track.src = toSource(path);
  track.default = true;
  v.appendChild(track);
  const tracks = v.textTracks;
  for (let i = 0; i < tracks.length; i += 1) {
    tracks[i].mode = i === tracks.length - 1 ? 'showing' : 'disabled';
  }
}

export const htmlVideoTransport: PlaybackTransport = {
  async init(_config, onProp) {
    notify = onProp;
    const v = video();
    const emitDuration = () => notify({ name: 'duration', data: duration(v) });
    v.addEventListener('play', () => notify({ name: 'pause', data: false }));
    v.addEventListener('pause', () => notify({ name: 'pause', data: true }));
    v.addEventListener('timeupdate', () => notify({ name: 'time-pos', data: v.currentTime }));
    v.addEventListener('durationchange', emitDuration);
    v.addEventListener('loadedmetadata', emitDuration);
    v.addEventListener('volumechange', () => {
      notify({ name: 'volume', data: Math.round(v.volume * 100) });
      notify({ name: 'mute', data: v.muted });
    });
    v.addEventListener('ratechange', () => notify({ name: 'speed', data: v.playbackRate }));
  },

  async command(name, args) {
    const v = video();
    switch (name) {
      case 'loadfile':
        v.src = toSource(String(args[0]));
        v.load();
        await v.play().catch(() => {});
        break;
      case 'stop':
        v.pause();
        v.removeAttribute('src');
        v.load();
        break;
      case 'seek': {
        const seconds = Number(args[0]);
        v.currentTime = args[1] === 'absolute' ? seconds : v.currentTime + seconds;
        break;
      }
      case 'frame-step':
        v.currentTime += 1 / 30;
        break;
      case 'frame-back-step':
        v.currentTime -= 1 / 30;
        break;
      case 'sub-add':
        addSubtitle(String(args[0]));
        break;
      case 'cycle':
        if (args[0] === 'pause') {
          if (v.paused) await v.play().catch(() => {});
          else v.pause();
        } else if (args[0] === 'mute') {
          v.muted = !v.muted;
        }
        break;
      default:
        break;
    }
  },

  async setProperty(name, value) {
    const v = video();
    switch (name) {
      case 'pause':
        if (value) v.pause();
        else await v.play().catch(() => {});
        break;
      case 'volume':
        v.volume = Math.max(0, Math.min(1, Number(value) / 100));
        break;
      case 'mute':
        v.muted = Boolean(value);
        break;
      case 'speed':
        v.playbackRate = Number(value);
        break;
      case 'sub-visibility':
        setSubtitleVisibility(Boolean(value));
        break;
      default:
        break;
    }
  },

  async getProperty(name) {
    const v = video();
    switch (name) {
      case 'time-pos':
        return v.currentTime;
      case 'duration':
        return duration(v);
      case 'pause':
        return v.paused;
      case 'volume':
        return Math.round(v.volume * 100);
      case 'mute':
        return v.muted;
      case 'speed':
        return v.playbackRate;
      case 'width':
        return v.videoWidth;
      case 'height':
        return v.videoHeight;
      case 'track-list':
        return [];
      default:
        return null;
    }
  },

  async destroy() {
    if (!element) return;
    element.pause();
    element.remove();
    element = null;
  },
};
