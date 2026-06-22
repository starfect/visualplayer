// 10-band graphic audio equalizer (VLC-style), realized as an mpv `af` filter
// chain: one ffmpeg peaking `equalizer` per band plus an optional pre-amp
// `volume`. Gains are in decibels (-20…+20); disabling clears the filter chain.

import { mpv } from '../../ipc/mpv';
import { equalizerStore, EQ_BANDS } from './store';

export interface EqPreset {
  name: string;
  preamp: number;
  gains: number[];
}

// Curated presets across the ten bands (31 Hz … 16 kHz), values in dB.
export const EQ_PRESETS: EqPreset[] = [
  { name: 'flat', preamp: 0, gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'rock', preamp: 0, gains: [7, 4, -4, -6, -2, 2, 5, 7, 8, 8] },
  { name: 'pop', preamp: 0, gains: [-1, 3, 5, 6, 5, 2, -1, -1, -1, -2] },
  { name: 'jazz', preamp: 0, gains: [4, 3, 1, 2, -2, -2, 0, 1, 3, 4] },
  { name: 'classical', preamp: 0, gains: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4] },
  { name: 'dance', preamp: 0, gains: [8, 6, 2, 0, 0, -3, -4, -4, 1, 0] },
  { name: 'bass', preamp: 0, gains: [10, 8, 6, 3, 1, 0, 0, 0, 0, 0] },
  { name: 'treble', preamp: 0, gains: [0, 0, 0, 0, 0, 2, 4, 7, 9, 10] },
  { name: 'vocal', preamp: 0, gains: [-3, -2, 0, 3, 5, 5, 4, 2, 0, -2] },
  { name: 'soft', preamp: 0, gains: [4, 2, 1, 0, -1, -1, 0, 2, 4, 5] },
];

const clamp = (v: number) => Math.max(-20, Math.min(20, Math.round(v)));

function buildFilter(preamp: number, gains: number[]): string {
  const filters: string[] = [];
  if (preamp !== 0) filters.push(`volume=volume=${(10 ** (preamp / 20)).toFixed(4)}`);
  gains.forEach((g, i) => {
    if (g !== 0) filters.push(`equalizer=f=${EQ_BANDS[i]}:t=o:w=2:g=${g}`);
  });
  return filters.length ? `lavfi=[${filters.join(',')}]` : '';
}

async function apply(): Promise<void> {
  const { enabled, preamp, gains } = equalizerStore.get();
  await mpv.setAudioFilter(enabled ? buildFilter(preamp, gains) : '');
}

export const equalizer = {
  async setEnabled(on: boolean): Promise<void> {
    equalizerStore.update({ enabled: on });
    await apply();
  },
  toggle(): Promise<void> {
    return equalizer.setEnabled(!equalizerStore.get().enabled);
  },
  async setBand(index: number, value: number): Promise<void> {
    const gains = [...equalizerStore.get().gains];
    gains[index] = clamp(value);
    equalizerStore.update({ gains, preset: 'custom', enabled: true });
    await apply();
  },
  async setPreamp(value: number): Promise<void> {
    equalizerStore.update({ preamp: clamp(value), enabled: true });
    await apply();
  },
  async applyPreset(name: string): Promise<void> {
    const preset = EQ_PRESETS.find((p) => p.name === name) ?? EQ_PRESETS[0];
    equalizerStore.update({
      preamp: preset.preamp,
      gains: [...preset.gains],
      preset: preset.name,
      enabled: preset.name !== 'flat',
    });
    await apply();
  },
};
