// Top-level layout: transparent video stage with overlaid controls, panels, and
// drag-and-drop (BLUEPRINT §3, §9.1, §11). mpv renders on the GPU layer below.

import { inTauri } from '../ipc/env';
import { pickFiles } from '../ipc';
import { playerStore } from '../stores/player';
import { uiStore } from '../stores/ui';
import { openPaths } from '../controllers/playback';
import { createControlBar } from './playerControls';
import { createPlaylistPanel } from './playlistPanel';
import { createSettingsPanel } from './settingsPanel';
import { createSubtitleOverlay } from './subtitleOverlay';
import { h, icon } from './dom';
import { t } from '../i18n';

function topBar(): HTMLElement {
  const title = h('span', { class: 'app-title' }, ['VisualPlayer']);
  const openBtn = h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      title: t('app.open_file'),
      'aria-label': t('app.open_file'),
      onclick: () => void pickFiles().then((paths) => openPaths(paths)),
    },
    [icon('folder')],
  );
  const playlistBtn = h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      title: t('playlist.title'),
      'aria-label': t('playlist.title'),
      onclick: () => uiStore.update({ playlistOpen: !uiStore.get().playlistOpen }),
    },
    [icon('list')],
  );
  const settingsBtn = h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      title: t('settings.title'),
      'aria-label': t('settings.title'),
      onclick: () => uiStore.update({ settingsOpen: !uiStore.get().settingsOpen }),
    },
    [icon('settings')],
  );

  return h('header', { class: 'top-bar' }, [
    title,
    h('div', { class: 'spacer' }, []),
    openBtn,
    playlistBtn,
    settingsBtn,
  ]);
}

function emptyState(): HTMLElement {
  const node = h('div', { class: 'empty-state' }, [
    icon('play'),
    h('p', { 'data-i18n': 'app.drop_hint' }, [t('app.drop_hint')]),
    h(
      'button',
      {
        class: 'btn primary',
        type: 'button',
        'data-i18n': 'app.open_file',
        onclick: () => void pickFiles().then((paths) => openPaths(paths)),
      },
      [t('app.open_file')],
    ),
  ]);
  playerStore.subscribe((state) => {
    node.hidden = state.loaded;
  });
  return node;
}

function setupDragAndDrop(root: HTMLElement): void {
  root.classList.add('drop-target');
  if (!inTauri) return;
  void (async () => {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview');
    await getCurrentWebview().onDragDropEvent((event) => {
      const payload = event.payload;
      if (payload.type === 'over' || payload.type === 'enter') {
        root.classList.add('drag-over');
      } else if (payload.type === 'drop') {
        root.classList.remove('drag-over');
        void openPaths(payload.paths);
      } else {
        root.classList.remove('drag-over');
      }
    });
  })();
}

function setupAutoHide(stage: HTMLElement): void {
  let timer: number | undefined;
  const show = () => {
    stage.classList.remove('controls-hidden');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (playerStore.get().loaded && !playerStore.get().paused) {
        stage.classList.add('controls-hidden');
      }
    }, 3000);
  };
  stage.addEventListener('mousemove', show);
  stage.addEventListener('focusin', show);
  show();
}

export function mountApp(root: HTMLElement): void {
  const stage = h('div', { class: 'stage' }, [
    h('div', { class: 'video-stage' }, []),
    createSubtitleOverlay(),
    emptyState(),
    topBar(),
    createControlBar(),
    createPlaylistPanel(),
    createSettingsPanel(),
  ]);

  setupDragAndDrop(stage);
  setupAutoHide(stage);
  root.replaceChildren(stage);
}
