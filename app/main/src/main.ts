import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { mountApp } from './ui/appShell';
import { applyTheme } from './ui/theme';
import { setLanguage } from './i18n';
import { settings as settingsIpc, assoc, detectOsLocale } from './ipc';
import { inTauri } from './ipc/env';
import { mpv, mpvInit } from './ipc/mpv';
import { initShortcuts } from './features/shortcuts';
import { settingsStore } from './stores/settings';
import { openPaths, recordCurrentProgress } from './controllers/playback';
import { toast, describeError } from './ui/toast';
import type { Settings } from './ipc/types';

async function loadSettings(): Promise<Settings> {
  if (!inTauri) return settingsStore.get();
  try {
    return await settingsIpc.get();
  } catch {
    return settingsStore.get();
  }
}

async function applyInitialPreferences(s: Settings): Promise<void> {
  // Playback
  await mpv.setVolume(s.volume);
  await mpv.setSpeed(s.playback.defaultSpeed);
  await mpv.setLoopFile(s.playback.loopFile);

  // Video
  await mpv.setDeinterlace(s.video.deinterlace);
  if (s.video.aspectRatio && s.video.aspectRatio !== '-1') {
    await mpv.setAspect(s.video.aspectRatio);
  }
  await mpv.setSnapshotFormat(s.video.snapshotFormat);

  // Subtitles
  await mpv.setSubtitleFontSize(s.subtitles.fontSize);
  await mpv.setSubtitleColor(s.subtitles.color);
  await mpv.setSubtitleBorderSize(s.subtitles.borderSize);
  await mpv.setSubtitleBold(s.subtitles.bold);
  await mpv.setSubtitlePos(s.subtitles.position);
  if (s.subtitles.defaultDelay) await mpv.setSubtitleDelay(s.subtitles.defaultDelay);
}

async function boot(): Promise<void> {
  const settings = await loadSettings();
  settingsStore.set(settings);

  const osLocale = await detectOsLocale();
  setLanguage(settings.language ?? osLocale ?? 'en');
  applyTheme(settings.theme);

  const root = document.getElementById('app');
  if (root) mountApp(root);

  await mpvInit(settings.playback.hardwareDecoding).catch((e) => toast(describeError(e), 'error'));
  await applyInitialPreferences(settings).catch(() => {});
  await initShortcuts();

  window.setInterval(() => void recordCurrentProgress(), 15000);
  window.addEventListener('beforeunload', () => void recordCurrentProgress());

  if (inTauri) {
    try {
      const files = await assoc.initialFiles();
      if (files.length > 0) await openPaths(files);
    } catch {
      /* no association files */
    }
  }
}

void boot();
