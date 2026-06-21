// Playback orchestration across the IPC layer and stores: torrent routing,
// resume-from-history, progress recording, and playlist navigation.

import { player, playlist, subtitle, torrent as torrentIpc, history as historyIpc } from '../ipc';
import { mpv } from '../ipc/mpv';
import { playerStore } from '../stores/player';
import { playlistStore } from '../stores/playlist';
import { settingsStore } from '../stores/settings';
import { toast, describeError } from '../ui/toast';
import { t } from '../i18n';

const isTorrent = (path: string) => path.toLowerCase().endsWith('.torrent');

async function maybeResume(path: string): Promise<void> {
  if (!settingsStore.get().playback.rememberPosition) return;
  try {
    const pos = await historyIpc.resumePosition(path);
    if (pos && pos > 1) {
      await mpv.seekAbsolute(pos);
      toast(t('player.resumed'));
    }
  } catch {
    /* resume is best-effort */
  }
}

export async function openPath(path: string, addToPlaylist = true): Promise<void> {
  try {
    let playable = path;
    let extraSubtitles: string[] = [];

    if (isTorrent(path)) {
      toast(t('torrent.loading'));
      const res = await torrentIpc.open(path);
      if (!res.videoPath) throw { code: 'error.not_found' };
      playable = res.videoPath;
      extraSubtitles = res.subtitlePaths;
    }

    const source = await player.load(playable);
    for (const sub of extraSubtitles) await subtitle.attach(sub);
    playerStore.update({ loaded: true, url: source.url, title: source.title });
    await maybeResume(source.url);
    if (addToPlaylist) {
      playlistStore.set(await playlist.add(path, source.title));
    }
  } catch (err) {
    toast(describeError(err), 'error');
  }
}

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

export async function playItemById(id: number): Promise<void> {
  try {
    const pl = await playlist.select(id);
    playlistStore.set(pl);
    const item = pl.items.find((i) => i.id === id);
    if (item) await openPath(item.path, false);
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

export async function recordCurrentProgress(): Promise<void> {
  const s = playerStore.get();
  if (!s.loaded || !s.url || s.duration <= 0) return;
  try {
    await historyIpc.record(s.url, s.title, s.timePos, s.duration);
  } catch {
    /* history is best-effort */
  }
}
