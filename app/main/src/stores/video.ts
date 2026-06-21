import { createStore } from './store';

export interface VideoState {
  aspect: string;
  rotate: number;
  zoom: number;
  deinterlace: boolean;
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  audioDelay: number;
  subDelay: number;
  abLoopA: number | null;
  abLoopB: number | null;
}

export const ASPECT_RATIOS = ['-1', '16:9', '4:3', '21:9', '1:1', '2.35:1'];

export const videoStore = createStore<VideoState>({
  aspect: '-1',
  rotate: 0,
  zoom: 0,
  deinterlace: false,
  brightness: 0,
  contrast: 0,
  gamma: 0,
  saturation: 0,
  hue: 0,
  audioDelay: 0,
  subDelay: 0,
  abLoopA: null,
  abLoopB: null,
});
