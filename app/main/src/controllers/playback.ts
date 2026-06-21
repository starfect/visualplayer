// Playback orchestration across the IPC layer and stores (BLUEPRINT §9.1/§9.2).
// The canonical playlist logic is unit-tested in `vp-core`; this mirrors the
// next/prev/repeat behaviour on the frontend for snappy navigation.

import { player, playlist } from '../ipc';
import { playerStore } from '../stores/player';
import { playlistStore } from '../stores/playlist';
import type { MediaSource } from '../ipc/types';
import { toast, describeError } from '../ui/toast';

function applyLoaded(source: MediaSource): void {
  playerStore.update({ loaded: true, url: source.url, title: source.title });
}

/** Load a path/URL, optionally appending it to the playlist, and start playback. */
export async function openPath(path: string, addToPlaylist = true): Promise<void> {
  try {
    const source = await player.load(path);
    applyLoaded(source);
    if (addToPlaylist) {
      playlistStore.set(await playlist.add(path, source.title));
    }
  } catch (err) {
    toast(describeError(err), 'error');
  }
}

/** Open a batch of paths: play the first, queue the rest. */
export async function openPaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await openPath(paths[0], true);
  for (const path of paths.slice(1)) {
    try {
      playlistStore.set(await playlist.add(path));
    } catch (err) {
      toast(describeError(err), 'error');
    }
  }
}

/** Select and play a playlist item by id. */
export async function playItemById(id: number): Promise<void> {
  try {
    const pl = await playlist.select(id);
    playlistStore.set(pl);
    const item = pl.items.find((i) => i.id === id);
    if (item) {
      applyLoaded(await player.load(item.path));
    }
  } catch (err) {
    toast(describeError(err), 'error');
  }
}

async function navigate(delta: 1 | -1): Promise<void> {
  const pl = playlistStore.get();
  if (pl.index === null || pl.items.length === 0) return;
  let next = pl.index + delta;
  if (next < 0 || next >= pl.items.length) {
    if (pl.repeat !== 'all') return;
    next = (next + pl.items.length) % pl.items.length;
  }
  await playItemById(pl.items[next].id);
}

export const playNext = () => navigate(1);
export const playPrev = () => navigate(-1);
