import { inTauri } from '../ipc/env';
import { pickFiles } from '../ipc';
import { playerStore } from '../stores/player';
import { uiStore, closePanels } from '../stores/ui';
import { openPaths } from '../controllers/playback';
import { attachGestures } from '../features/gestures';
import { createControlBar } from './playerControls';
import { createPlaylistPanel } from './playlistPanel';
import { createSettingsPanel } from './settingsPanel';
import { createToolsPanel } from './toolsPanel';
import { createSubtitleOverlay } from './subtitleOverlay';
import { h, icon, iconButton } from './dom';
import { t } from '../i18n';

function topBar(): HTMLElement {
  return h('header', { class: 'top-bar' }, [
    h('span', { class: 'app-title' }, ['VisualPlayer']),
    h('div', { class: 'spacer' }, []),
    iconButton('app.open_file', 'folder', () => void pickFiles().then(openPaths), t),
  ]);
}

function emptyState(): HTMLElement {
  const node = h('div', { class: 'empty-state' }, [
    icon('play'),
    h('p', {}, [t('app.drop_hint')]),
    h(
      'button',
      { class: 'btn primary', type: 'button', onclick: () => void pickFiles().then(openPaths) },
      [t('app.open_file')],
    ),
  ]);
  playerStore.subscribe((s) => (node.hidden = s.loaded));
  return node;
}

function setupDragAndDrop(stage: HTMLElement): void {
  if (!inTauri) return;
  void (async () => {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview');
    await getCurrentWebview().onDragDropEvent((event) => {
      const p = event.payload;
      if (p.type === 'over' || p.type === 'enter') stage.classList.add('drag-over');
      else if (p.type === 'drop') {
        stage.classList.remove('drag-over');
        void openPaths(p.paths);
      } else stage.classList.remove('drag-over');
    });
  })();
}

function setupAutoHide(stage: HTMLElement): void {
  let timer: number | undefined;
  const show = () => {
    stage.classList.remove('controls-hidden');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const s = playerStore.get();
      if (s.loaded && !s.paused) stage.classList.add('controls-hidden');
    }, 3000);
  };
  stage.addEventListener('mousemove', show);
  stage.addEventListener('focusin', show);
  show();
}

export function mountApp(root: HTMLElement): void {
  const dim = h('div', { class: 'dim-overlay' });
  const stage = h('div', { class: 'stage' }, [
    h('div', { class: 'video-stage' }, []),
    dim,
    createSubtitleOverlay(),
    emptyState(),
    topBar(),
    createControlBar(),
    createPlaylistPanel(),
    createSettingsPanel(),
    createToolsPanel(),
  ]);

  stage.addEventListener('click', (e) => {
    if (e.target === stage || (e.target as HTMLElement).classList.contains('video-stage')) {
      closePanels();
    }
  });

  setupDragAndDrop(stage);
  setupAutoHide(stage);
  attachGestures(stage, dim);
  uiStore.subscribe((ui) =>
    stage.classList.toggle('panel-open', ui.playlistOpen || ui.settingsOpen || ui.toolsOpen),
  );
  root.replaceChildren(stage);
}
