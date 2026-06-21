// Side panel listing playlist items (BLUEPRINT §9.2). Clicking an item plays it.
import { playlistStore } from '../stores/playlist';
import { uiStore } from '../stores/ui';
import { playItemById } from '../controllers/playback';
import { playlist as playlistIpc, pickPlaylistToOpen, pickPlaylistToSave } from '../ipc';
import type { Playlist, PlaylistItem } from '../ipc/types';
import { h, icon } from './dom';
import { toast, describeError } from './toast';
import { t } from './../i18n';

async function savePlaylist(): Promise<void> {
  try {
    const path = await pickPlaylistToSave();
    if (!path) return;
    await playlistIpc.exportM3u(path);
    toast(t('playlist.saved'));
  } catch (err) {
    toast(describeError(err), 'error');
  }
}

async function loadPlaylist(): Promise<void> {
  try {
    const path = await pickPlaylistToOpen();
    if (!path) return;
    playlistStore.set(await playlistIpc.importM3u(path));
  } catch (err) {
    toast(describeError(err), 'error');
  }
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function itemRow(item: PlaylistItem, isCurrent: boolean): HTMLElement {
  const label = item.title ?? basename(item.path);
  const remove = h(
    'button',
    {
      class: 'icon-btn small',
      type: 'button',
      title: t('playlist.remove'),
      'aria-label': t('playlist.remove'),
      onclick: (e: Event) => {
        e.stopPropagation();
        void playlistIpc.remove(item.id).then((pl) => playlistStore.set(pl));
      },
    },
    [icon('close')],
  );
  return h(
    'li',
    {
      class: `playlist-item${isCurrent ? ' current' : ''}`,
      title: item.path,
      onclick: () => void playItemById(item.id),
    },
    [h('span', { class: 'playlist-item-label' }, [label]), remove],
  );
}

export function createPlaylistPanel(): HTMLElement {
  const list = h('ul', { class: 'playlist-items' });
  const empty = h('p', { class: 'panel-empty', 'data-i18n': 'playlist.empty' }, [
    t('playlist.empty'),
  ]);

  const headerBtn = (iconName: string, label: string, onClick: () => void) =>
    h(
      'button',
      {
        class: 'icon-btn small',
        type: 'button',
        title: label,
        'aria-label': label,
        onclick: onClick,
      },
      [icon(iconName)],
    );

  const header = h('header', { class: 'panel-header' }, [
    h('h2', { 'data-i18n': 'playlist.title' }, [t('playlist.title')]),
    h('div', { class: 'panel-header-actions' }, [
      headerBtn('load', t('playlist.load'), () => void loadPlaylist()),
      headerBtn('save', t('playlist.save'), () => void savePlaylist()),
      headerBtn('close', t('settings.close'), () => uiStore.update({ playlistOpen: false })),
    ]),
  ]);

  const panel = h('aside', { class: 'panel playlist-panel' }, [header, empty, list]);

  const render = (pl: Playlist) => {
    list.replaceChildren(...pl.items.map((item, i) => itemRow(item, i === pl.index)));
    empty.hidden = pl.items.length > 0;
  };
  playlistStore.subscribe(render);

  uiStore.subscribe((ui) => panel.classList.toggle('open', ui.playlistOpen));
  return panel;
}
