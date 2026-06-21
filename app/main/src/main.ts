// Application bootstrap (BLUEPRINT §6). Order: load settings → resolve language →
// apply theme → mount UI → init mpv → subscribe events → open association files.

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { mountApp } from './ui/appShell';
import { applyTheme } from './ui/theme';
import { setLanguage } from './i18n';
import { settings as settingsIpc, system, detectOsLocale } from './ipc';
import { inTauri } from './ipc/env';
import { mpvInit } from './ipc/mpv';
import { subscribeTaskEvents } from './ipc/events';
import { settingsStore } from './stores/settings';
import { openPaths } from './controllers/playback';
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

async function boot(): Promise<void> {
  const settings = await loadSettings();
  settingsStore.set(settings);

  const osLocale = await detectOsLocale();
  setLanguage(settings.language ?? osLocale ?? 'en');
  applyTheme(settings.theme);

  const root = document.getElementById('app');
  if (root) mountApp(root);

  await mpvInit().catch((err) => toast(describeError(err), 'error'));
  await subscribeTaskEvents();

  if (inTauri) {
    try {
      const files = await system.initialFiles();
      if (files.length > 0) await openPaths(files);
    } catch {
      /* no association files */
    }
  }
}

void boot();
