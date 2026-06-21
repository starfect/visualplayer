// Global keyboard shortcuts: resolves key chords to actions (seeded from the
// backend default map or the user's custom bindings) and dispatches them.

import { player, settings as settingsIpc } from '../../ipc';
import { mpv } from '../../ipc/mpv';
import { video } from '../video';
import { toggleAbLoop } from '../abloop';
import { playNext, playPrev } from '../../controllers/playback';
import { toggleFullscreen, exitFullscreen } from '../../ui/fullscreen';
import { settingsStore } from '../../stores/settings';
import { playerStore } from '../../stores/player';
import { uiStore } from '../../stores/ui';
import type { Action, Binding, KeyChord } from '../../ipc/types';

let bindings: Binding[] = [];

function normalizeKey(key: string): string {
  return key === ' ' || key === 'Spacebar' ? 'space' : key.toLowerCase();
}

function chordFromEvent(e: KeyboardEvent): KeyChord {
  return {
    key: normalizeKey(e.key),
    ctrl: e.ctrlKey || e.metaKey,
    shift: e.shiftKey,
    alt: e.altKey,
  };
}

function sameChord(a: KeyChord, b: KeyChord): boolean {
  return a.key === b.key && !!a.ctrl === !!b.ctrl && !!a.shift === !!b.shift && !!a.alt === !!b.alt;
}

function resolve(chord: KeyChord): Action | null {
  return bindings.find((b) => sameChord(b.chord, chord))?.action ?? null;
}

const round = (n: number) => Math.round(n * 100) / 100;
const seekStep = () => settingsStore.get().playback.seekStepSeconds;
const seekLong = () => settingsStore.get().playback.seekStepLongSeconds;
const volStep = () => settingsStore.get().playback.volumeStep;

async function dispatch(action: Action): Promise<void> {
  const p = playerStore.get();
  switch (action) {
    case 'toggle_play':
      return player.togglePause();
    case 'stop':
      return player.stop();
    case 'seek_forward':
      return player.seek(seekStep());
    case 'seek_backward':
      return player.seek(-seekStep());
    case 'seek_forward_long':
      return player.seek(seekLong());
    case 'seek_backward_long':
      return player.seek(-seekLong());
    case 'next_frame':
      return player.frameStep();
    case 'prev_frame':
      return player.frameBackStep();
    case 'volume_up':
      return player.setVolume(p.volume + volStep());
    case 'volume_down':
      return player.setVolume(Math.max(0, p.volume - volStep()));
    case 'toggle_mute':
      return player.toggleMute();
    case 'toggle_fullscreen':
      return toggleFullscreen();
    case 'playlist_next':
      return playNext();
    case 'playlist_prev':
      return playPrev();
    case 'speed_up':
      return player.setSpeed(round(p.speed + 0.1));
    case 'speed_down':
      return player.setSpeed(Math.max(0.25, round(p.speed - 0.1)));
    case 'speed_reset':
      return player.setSpeed(1);
    case 'screenshot':
      return player.screenshot();
    case 'toggle_subtitles':
    case 'cycle_subtitle_track':
      return mpv.cycleSubtitle();
    case 'cycle_audio_track':
      return mpv.cycleAudioTrack();
    case 'subtitle_delay_inc':
      return video.nudgeSubDelay(0.1);
    case 'subtitle_delay_dec':
      return video.nudgeSubDelay(-0.1);
    case 'audio_delay_inc':
      return video.nudgeAudioDelay(0.1);
    case 'audio_delay_dec':
      return video.nudgeAudioDelay(-0.1);
    case 'toggle_playlist_panel':
      uiStore.update({ playlistOpen: !uiStore.get().playlistOpen });
      return;
    case 'toggle_settings':
      uiStore.update({ settingsOpen: !uiStore.get().settingsOpen });
      return;
    case 'toggle_ab_loop':
      return toggleAbLoop();
    case 'cycle_aspect':
      return video.cycleAspect();
    case 'rotate':
      return video.rotate();
    case 'zoom_in':
      return video.zoomIn();
    case 'zoom_out':
      return video.zoomOut();
    case 'zoom_reset':
      return video.zoomReset();
    case 'jump_start':
      return player.seek(0, 'absolute');
    case 'jump_end':
      return player.seek(Math.max(0, p.duration - 1), 'absolute');
  }
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

function onKeyDown(e: KeyboardEvent): void {
  if (isTypingTarget(e)) return;
  if (e.key === 'Escape') {
    void exitFullscreen();
    return;
  }
  const action = resolve(chordFromEvent(e));
  if (action) {
    e.preventDefault();
    void dispatch(action);
  }
}

export async function initShortcuts(): Promise<void> {
  const custom = settingsStore.get().keybindings;
  if (custom.length) {
    bindings = custom;
  } else {
    try {
      bindings = await settingsIpc.defaultKeybindings();
    } catch {
      bindings = [];
    }
  }
  window.addEventListener('keydown', onKeyDown);
}

export function currentBindings(): Binding[] {
  return bindings;
}
