// Video & audio adjustment feature: aspect, rotation, zoom, deinterlace, the
// colour equalizer, and audio/subtitle delay — all mirrored into the video store.

import { mpv } from '../../ipc/mpv';
import { videoStore, ASPECT_RATIOS, type VideoState } from './store';

type EqChannel = 'brightness' | 'contrast' | 'gamma' | 'saturation' | 'hue';

const clampZoom = (z: number) => Math.max(-2, Math.min(2, Number(z.toFixed(2))));
const clampEq = (v: number) => Math.max(-100, Math.min(100, Math.round(v)));

export const video = {
  setAspect(ratio: string): Promise<void> {
    videoStore.update({ aspect: ratio });
    return mpv.setAspect(ratio);
  },
  cycleAspect(): Promise<void> {
    const i = ASPECT_RATIOS.indexOf(videoStore.get().aspect);
    return video.setAspect(ASPECT_RATIOS[(i + 1) % ASPECT_RATIOS.length]);
  },
  rotate(): Promise<void> {
    const deg = (videoStore.get().rotate + 90) % 360;
    videoStore.update({ rotate: deg });
    return mpv.setRotate(deg);
  },
  zoomIn: () => applyZoom(videoStore.get().zoom + 0.1),
  zoomOut: () => applyZoom(videoStore.get().zoom - 0.1),
  zoomReset: () => applyZoom(0),
  toggleDeinterlace(): Promise<void> {
    const on = !videoStore.get().deinterlace;
    videoStore.update({ deinterlace: on });
    return mpv.setDeinterlace(on);
  },
  setEq(channel: EqChannel, value: number): Promise<void> {
    const v = clampEq(value);
    videoStore.update({ [channel]: v } as Partial<VideoState>);
    const setters: Record<EqChannel, (n: number) => Promise<void>> = {
      brightness: mpv.setBrightness,
      contrast: mpv.setContrast,
      gamma: mpv.setGamma,
      saturation: mpv.setSaturation,
      hue: mpv.setHue,
    };
    return setters[channel](v);
  },
  async resetEq(): Promise<void> {
    await Promise.all([
      video.setEq('brightness', 0),
      video.setEq('contrast', 0),
      video.setEq('gamma', 0),
      video.setEq('saturation', 0),
      video.setEq('hue', 0),
    ]);
  },
  setAudioDelay(seconds: number): Promise<void> {
    const s = Number(seconds.toFixed(3));
    videoStore.update({ audioDelay: s });
    return mpv.setAudioDelay(s);
  },
  nudgeAudioDelay: (delta: number) => video.setAudioDelay(videoStore.get().audioDelay + delta),
  setSubDelay(seconds: number): Promise<void> {
    const s = Number(seconds.toFixed(3));
    videoStore.update({ subDelay: s });
    return mpv.setSubtitleDelay(s);
  },
  nudgeSubDelay: (delta: number) => video.setSubDelay(videoStore.get().subDelay + delta),
};

function applyZoom(value: number): Promise<void> {
  const z = clampZoom(value);
  videoStore.update({ zoom: z });
  return mpv.setZoom(z);
}
