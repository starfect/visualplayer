import { createStore } from './store';

// ISO 10-band graphic-equalizer centre frequencies (Hz), low to high.
export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export interface EqualizerState {
  enabled: boolean;
  preamp: number;
  gains: number[];
  preset: string;
}

export const equalizerStore = createStore<EqualizerState>({
  enabled: false,
  preamp: 0,
  gains: EQ_BANDS.map(() => 0),
  preset: 'flat',
});
