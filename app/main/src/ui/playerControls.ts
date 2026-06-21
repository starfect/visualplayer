// Bottom control bar: transport, seek, volume, speed, subtitle/fullscreen.
// Wires DOM events to the IPC `player` facade and reflects the player store.

import { player } from '../ipc';
import { inTauri } from '../ipc/env';
import { playerStore, type PlayerState } from '../stores/player';
import { settingsStore } from '../stores/settings';
import { playNext, playPrev } from '../controllers/playback';
import { h, icon, formatTime } from './dom';
import { t } from '../i18n';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function iconButton(i18nKey: string, iconName: string, onClick: () => void): HTMLButtonElement {
  return h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      'data-i18n-title': i18nKey,
      'data-i18n-aria': i18nKey,
      title: t(i18nKey),
      'aria-label': t(i18nKey),
      onclick: onClick,
    },
    [icon(iconName)],
  );
}

async function toggleFullscreen(): Promise<void> {
  if (!inTauri) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  await win.setFullscreen(!(await win.isFullscreen()));
}

export function createControlBar(): HTMLElement {
  let seeking = false;

  const playBtn = iconButton('player.play', 'play', () => void player.togglePause());
  const prevBtn = iconButton('player.previous', 'prev', () => void playPrev());
  const nextBtn = iconButton('player.next', 'next', () => void playNext());

  const current = h('span', { class: 'time time-current' }, ['0:00']);
  const total = h('span', { class: 'time time-total' }, ['0:00']);

  const seek = h('input', {
    class: 'seek',
    type: 'range',
    min: '0',
    max: '100',
    step: '0.1',
    value: '0',
    'data-i18n-aria': 'player.play',
  }) as HTMLInputElement;
  seek.addEventListener('pointerdown', () => {
    seeking = true;
  });
  const commitSeek = () => {
    seeking = false;
    void player.seek(Number(seek.value), 'absolute');
  };
  seek.addEventListener('change', commitSeek);
  seek.addEventListener('input', () => {
    current.textContent = formatTime(Number(seek.value));
  });

  const volume = h('input', {
    class: 'volume',
    type: 'range',
    min: '0',
    max: '100',
    step: '1',
    value: '100',
    'data-i18n-aria': 'player.volume',
    'aria-label': t('player.volume'),
  }) as HTMLInputElement;
  volume.addEventListener('input', () => {
    const v = Number(volume.value);
    void player.setVolume(v);
    settingsStore.update({ volume: v });
  });

  const speed = h(
    'select',
    { class: 'speed', 'data-i18n-title': 'player.speed', title: t('player.speed') },
    SPEEDS.map((s) => h('option', { value: String(s), selected: s === 1 }, [`${s}×`])),
  ) as HTMLSelectElement;
  speed.addEventListener('change', () => void player.setSpeed(Number(speed.value)));

  const shotBtn = iconButton('player.screenshot', 'screenshot', () => void player.screenshot());
  const fsBtn = iconButton('player.fullscreen', 'fullscreen', () => void toggleFullscreen());

  const bar = h('footer', { class: 'control-bar' }, [
    h('div', { class: 'control-row seek-row' }, [current, seek, total]),
    h('div', { class: 'control-row buttons-row' }, [
      h('div', { class: 'control-group' }, [prevBtn, playBtn, nextBtn]),
      h('div', { class: 'control-group' }, [icon('volume'), volume]),
      h('div', { class: 'control-group spacer' }, []),
      h('div', { class: 'control-group' }, [speed, shotBtn, fsBtn]),
    ]),
  ]);

  const render = (state: PlayerState) => {
    const btnIcon = state.paused ? 'play' : 'pause';
    const btnKey = state.paused ? 'player.play' : 'player.pause';
    playBtn.replaceChildren(icon(btnIcon));
    playBtn.title = t(btnKey);
    playBtn.setAttribute('aria-label', t(btnKey));
    playBtn.dataset.i18nTitle = btnKey;
    playBtn.dataset.i18nAria = btnKey;

    seek.max = String(state.duration > 0 ? state.duration : 100);
    if (!seeking) {
      seek.value = String(state.timePos);
      current.textContent = formatTime(state.timePos);
    }
    total.textContent = formatTime(state.duration);
    volume.value = String(Math.round(state.volume));

    const disabled = !state.loaded;
    for (const ctrl of [playBtn, prevBtn, nextBtn, seek, speed, shotBtn, fsBtn]) {
      ctrl.toggleAttribute('disabled', disabled);
    }
  };

  playerStore.subscribe(render);
  return bar;
}
