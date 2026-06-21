// Touch gestures on the video stage (VLC-mobile style): horizontal swipe seeks,
// vertical swipe adjusts volume (right half) or brightness (left half),
// double-tap on either side skips. Brightness is emulated via a dim overlay.

import { player } from '../../ipc';
import { playerStore } from '../../stores/player';
import { settingsStore } from '../../stores/settings';
import { showGestureFeedback } from '../../ui/gestureFeedback';
import { formatTime } from '../../ui/dom';

type Mode = 'none' | 'seek' | 'volume' | 'brightness';

const THRESHOLD = 12;

export function attachGestures(stage: HTMLElement, dimOverlay: HTMLElement): void {
  let active = false;
  let mode: Mode = 'none';
  let startX = 0;
  let startY = 0;
  let startVolume = 0;
  let startBrightness = 1;
  let startTime = 0;
  let seekTarget = 0;
  let lastTapAt = 0;
  let lastTapX = 0;
  let brightness = 1;

  const cfg = () => settingsStore.get().gestures;

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !cfg().enabled) return;
    active = true;
    mode = 'none';
    startX = e.clientX;
    startY = e.clientY;
    startVolume = playerStore.get().volume;
    startBrightness = brightness;
    startTime = playerStore.get().timePos;
  });

  stage.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (mode === 'none') {
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      if (Math.abs(dx) > Math.abs(dy)) mode = 'seek';
      else mode = startX < stage.clientWidth / 2 ? 'brightness' : 'volume';
    }
    if (mode === 'seek' && cfg().seekEnabled) {
      const delta = (dx / stage.clientWidth) * 90 * cfg().seekSensitivity;
      seekTarget = Math.max(0, startTime + delta);
      showGestureFeedback(
        `${delta >= 0 ? '+' : ''}${Math.round(delta)}s · ${formatTime(seekTarget)}`,
      );
    } else if (mode === 'volume' && cfg().volumeEnabled) {
      const v = Math.max(0, Math.min(100, startVolume - (dy / stage.clientHeight) * 150));
      void player.setVolume(v);
      showGestureFeedback(`♪ ${Math.round(v)}%`);
    } else if (mode === 'brightness' && cfg().brightnessEnabled) {
      brightness = Math.max(0.2, Math.min(1, startBrightness - (dy / stage.clientHeight) * 1.2));
      dimOverlay.style.opacity = String(1 - brightness);
      showGestureFeedback(`☀ ${Math.round(brightness * 100)}%`);
    }
  });

  const finish = () => {
    if (mode === 'seek') void player.seek(seekTarget, 'absolute');
    active = false;
    mode = 'none';
  };

  stage.addEventListener('pointerup', (e) => {
    if (mode === 'none' && cfg().doubleTapSeek && e.pointerType !== 'mouse') {
      const now = Date.now();
      if (now - lastTapAt < 300 && Math.abs(e.clientX - lastTapX) < 60) {
        const forward = e.clientX > stage.clientWidth / 2;
        void player.seek(forward ? 10 : -10);
        showGestureFeedback(forward ? '+10s' : '-10s');
        lastTapAt = 0;
      } else {
        lastTapAt = now;
        lastTapX = e.clientX;
      }
    }
    finish();
  });
  stage.addEventListener('pointercancel', finish);
}
