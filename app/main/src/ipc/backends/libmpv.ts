// Desktop playback transport: a thin pass-through to the libmpv plugin.

import {
  init as libmpvInit,
  command,
  setProperty,
  getProperty,
  observeProperties,
  destroy,
} from 'tauri-plugin-libmpv-api';

import type { PlaybackTransport } from '../transport';

export const libmpvTransport: PlaybackTransport = {
  async init(config, onProp) {
    await libmpvInit(config);
    if (config.observedProperties) await observeProperties(config.observedProperties, onProp);
  },
  command: (name, args) => command(name, args),
  setProperty: (name, value) => setProperty(name, value),
  getProperty: (name, format) => getProperty(name, format),
  destroy: () => destroy(),
};
