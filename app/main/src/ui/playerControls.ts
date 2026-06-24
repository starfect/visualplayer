import { player } from '../ipc';
import { mpv } from '../ipc/mpv';
import { playerStore, type PlayerState } from '../stores/player';
import { settingsStore } from '../stores/settings';
import { uiStore } from '../stores/ui';
import { playNext, playPrev } from '../controllers/playback';
import { toggleMiniPlayer } from '../features/pip';
import { toggleFullscreen } from './fullscreen';
import { h, icon, iconButton, formatTime } from './dom';
import { t } from '../i18n';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function createControlBar(): HTMLElement {
  let seeking = false;
  const btn = (key: string, ic: string, fn: () => void) => iconButton(key, ic, fn, t);
  const toggle = (k: 'playlistOpen' | 'settingsOpen' | 'toolsOpen') => () =>
    uiStore.update({ [k]: !uiStore.get()[k] });

  const playBtn = btn('player.play', 'play', () => void player.togglePause());
  playBtn.classList.add('play');
  const prevBtn = btn('player.previous', 'prev', () => void playPrev());
  const nextBtn = btn('player.next', 'next', () => void playNext());
  const muteBtn = btn('player.mute', 'volume', () => void player.toggleMute());

  const current = h('span', { class: 'time' }, ['0:00']);
  const total = h('span', { class: 'time' }, ['0:00']);

  const seek = h('input', {
    class: 'seek',
    type: 'range',
    min: '0',
    max: '100',
    step: '0.1',
    value: '0',
    'aria-label': t('player.play'),
  }) as HTMLInputElement;
  seek.addEventListener('pointerdown', () => (seeking = true));
  seek.addEventListener('input', () => (current.textContent = formatTime(Number(seek.value))));
  seek.addEventListener('change', () => {
    seeking = false;
    void player.seek(Number(seek.value), 'absolute');
  });

  const volume = h('input', {
    class: 'volume',
    type: 'range',
    min: '0',
    max: '100',
    step: '1',
    value: '100',
    'aria-label': t('player.volume'),
  }) as HTMLInputElement;
  volume.addEventListener('input', () => {
    const v = Number(volume.value);
    void player.setVolume(v);
    settingsStore.update({ volume: v });
  });

  const speed = h(
    'select',
    { class: 'speed', 'aria-label': t('player.speed'), title: t('player.speed') },
    SPEEDS.map((s) => h('option', { value: String(s), selected: s === 1 }, [`${s}×`])),
  ) as HTMLSelectElement;
  speed.addEventListener('change', () => void player.setSpeed(Number(speed.value)));

  const bar = h('footer', { class: 'control-bar' }, [
    h('div', { class: 'seek-row' }, [current, seek, total]),
    h('div', { class: 'buttons-row' }, [
      h('div', { class: 'group' }, [prevBtn, playBtn, nextBtn]),
      h('div', { class: 'group' }, [muteBtn, volume]),
      h('div', { class: 'group' }, [speed]),
      h('div', { class: 'group grow' }, []),
      h('div', { class: 'group' }, [
        btn('subtitle.cycle', 'subtitle', () => void mpv.cycleSubtitle()),
        btn('tools.title', 'tools', toggle('toolsOpen')),
        btn('player.screenshot', 'screenshot', () => void player.screenshot()),
        btn('playlist.title', 'list', toggle('playlistOpen')),
        btn('player.mini_player', 'pip', () => void toggleMiniPlayer()),
        btn('settings.title', 'settings', toggle('settingsOpen')),
        btn('player.fullscreen', 'fullscreen', () => void toggleFullscreen()),
      ]),
    ]),
  ]);

  const controls = [playBtn, prevBtn, nextBtn, seek, speed];
  playerStore.subscribe((state: PlayerState) => {
    playBtn.replaceChildren(icon(state.paused ? 'play' : 'pause'));
    playBtn.setAttribute('aria-label', t(state.paused ? 'player.play' : 'player.pause'));
    muteBtn.replaceChildren(icon(state.muted ? 'mute' : 'volume'));
    seek.max = String(state.duration > 0 ? state.duration : 100);
    if (!seeking) {
      seek.value = String(state.timePos);
      current.textContent = formatTime(state.timePos);
    }
    total.textContent = formatTime(state.duration);
    volume.value = String(Math.round(state.volume));
    for (const c of controls) c.toggleAttribute('disabled', !state.loaded);
  });

  return bar;
}
