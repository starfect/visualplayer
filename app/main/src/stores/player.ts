// Player playback state, fed by mpv property observation (BLUEPRINT §6.2).
import { createStore } from './store';

export interface PlayerState {
  loaded: boolean;
  url: string | null;
  title: string | null;
  filename: string | null;
  paused: boolean;
  timePos: number;
  duration: number;
  volume: number;
  speed: number;
  subText: string;
}

export const playerStore = createStore<PlayerState>({
  loaded: false,
  url: null,
  title: null,
  filename: null,
  paused: true,
  timePos: 0,
  duration: 0,
  volume: 100,
  speed: 1,
  subText: '',
});
