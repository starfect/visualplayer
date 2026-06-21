// Settings panel: language and theme (BLUEPRINT §6.3/§11). Changes apply live.
import { settings as settingsIpc } from '../ipc';
import { inTauri } from '../ipc/env';
import { settingsStore } from '../stores/settings';
import { uiStore } from '../stores/ui';
import { SUPPORTED_LANGUAGES, setLanguage, t } from '../i18n';
import { applyTheme } from './theme';
import type { Settings, Theme } from '../ipc/types';
import { h, icon } from './dom';
import { toast, describeError } from './toast';

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', ko: '한국어' };
const THEMES: Theme[] = ['system', 'light', 'dark'];

function field(labelKey: string, control: HTMLElement): HTMLElement {
  return h('label', { class: 'settings-field' }, [
    h('span', { 'data-i18n': labelKey }, [t(labelKey)]),
    control,
  ]);
}

export function createSettingsPanel(): HTMLElement {
  const langSelect = h(
    'select',
    { class: 'settings-select' },
    SUPPORTED_LANGUAGES.map((code) => h('option', { value: code }, [LANGUAGE_NAMES[code] ?? code])),
  ) as HTMLSelectElement;
  langSelect.addEventListener('change', () => {
    const lang = langSelect.value;
    setLanguage(lang);
    settingsStore.update({ language: lang });
    if (inTauri) {
      settingsIpc.setLanguage(lang).catch((err) => toast(describeError(err), 'error'));
    }
  });

  const themeSelect = h(
    'select',
    { class: 'settings-select' },
    THEMES.map((th) =>
      h('option', { value: th, 'data-i18n': `settings.theme_${th}` }, [t(`settings.theme_${th}`)]),
    ),
  ) as HTMLSelectElement;
  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value as Theme;
    applyTheme(theme);
    const next: Settings = { ...settingsStore.get(), theme };
    settingsStore.set(next);
    if (inTauri) {
      settingsIpc.set(next).catch((err) => toast(describeError(err), 'error'));
    }
  });

  const header = h('header', { class: 'panel-header' }, [
    h('h2', { 'data-i18n': 'settings.title' }, [t('settings.title')]),
    h(
      'button',
      {
        class: 'icon-btn small',
        type: 'button',
        title: t('settings.close'),
        'aria-label': t('settings.close'),
        onclick: () => uiStore.update({ settingsOpen: false }),
      },
      [icon('close')],
    ),
  ]);

  const panel = h('aside', { class: 'panel settings-panel' }, [
    header,
    field('settings.language', langSelect),
    field('settings.theme', themeSelect),
  ]);

  settingsStore.subscribe((s) => {
    langSelect.value = s.language ?? SUPPORTED_LANGUAGES[0];
    themeSelect.value = s.theme;
  });
  uiStore.subscribe((ui) => panel.classList.toggle('open', ui.settingsOpen));
  return panel;
}
