// Playlist state mirrored from the backend (BLUEPRINT §6.2/§9.2).
import { createStore } from './store';
import type { Playlist } from '../ipc/types';

export const playlistStore = createStore<Playlist>({
  items: [],
  index: null,
  repeat: 'off',
  shuffle: false,
});
