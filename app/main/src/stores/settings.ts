import { createStore } from './store';
import type { Settings } from '../ipc/types';

export const settingsStore = createStore<Settings>({
  language: null,
  theme: 'system',
  defaultResolution: null,
  volume: 100,
  speed: 1,
  maxSimultaneous: 4,
  playback: {
    rememberPosition: true,
    hardwareDecoding: true,
    seekStepSeconds: 5,
    seekStepLongSeconds: 60,
    volumeStep: 5,
    maxVolume: 130,
    autoplayNext: true,
    pauseOnMinimize: false,
  },
  subtitles: {
    autoload: true,
    fontSize: 48,
    color: '#FFFFFF',
    borderSize: 2,
    position: 100,
    defaultDelay: 0,
    bold: false,
  },
  gestures: {
    enabled: true,
    seekEnabled: true,
    volumeEnabled: true,
    brightnessEnabled: true,
    doubleTapSeek: true,
    seekSensitivity: 1,
  },
  keybindings: [],
});
