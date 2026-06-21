// Settings state (theme/language/…) mirrored from the backend (BLUEPRINT §6.2).
import { createStore } from './store';
import type { Settings } from '../ipc/types';

export const settingsStore = createStore<Settings>({
  language: null,
  theme: 'system',
  defaultResolution: null,
  volume: 100,
  speed: 1,
  maxSimultaneous: 4,
});
