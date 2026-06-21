import { settings as settingsIpc, assoc, system } from '../ipc';
import { mpv } from '../ipc/mpv';
import { inTauri } from '../ipc/env';
import { settingsStore } from '../stores/settings';
import { uiStore } from '../stores/ui';
import { SUPPORTED_LANGUAGES, setLanguage, t } from '../i18n';
import { applyTheme } from './theme';
import { currentBindings } from '../features/shortcuts';
import type { Settings, Theme } from '../ipc/types';
import { h, icon } from './dom';
import { toast, describeError } from './toast';

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', ko: '한국어', ja: '日本語' };
const THEMES: Theme[] = ['system', 'light', 'dark'];

async function persist(next: Settings): Promise<void> {
  settingsStore.set(next);
  if (inTauri) {
    try {
      await settingsIpc.set(next);
    } catch (e) {
      toast(describeError(e), 'error');
    }
  }
}

interface Field {
  row: HTMLElement;
  sync: (s: Settings) => void;
}

function boolField(
  labelKey: string,
  get: (s: Settings) => boolean,
  set: (s: Settings, v: boolean) => Settings,
): Field {
  const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
  input.addEventListener('change', () => void persist(set(settingsStore.get(), input.checked)));
  const row = h('label', { class: 'settings-toggle' }, [h('span', {}, [t(labelKey)]), input]);
  return { row, sync: (s) => (input.checked = get(s)) };
}

export function createSettingsPanel(): HTMLElement {
  const fields: Field[] = [];

  const langSelect = h(
    'select',
    { class: 'settings-select' },
    SUPPORTED_LANGUAGES.map((c) => h('option', { value: c }, [LANGUAGE_NAMES[c] ?? c])),
  ) as HTMLSelectElement;
  langSelect.addEventListener('change', () => {
    setLanguage(langSelect.value);
    void persist({ ...settingsStore.get(), language: langSelect.value });
    if (inTauri) settingsIpc.setLanguage(langSelect.value).catch(() => {});
  });

  const themeSelect = h(
    'select',
    { class: 'settings-select' },
    THEMES.map((th) => h('option', { value: th }, [t(`settings.theme_${th}`)])),
  ) as HTMLSelectElement;
  themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value as Theme;
    applyTheme(theme);
    void persist({ ...settingsStore.get(), theme });
  });

  const fontSize = h('input', {
    type: 'range',
    min: '16',
    max: '120',
    step: '2',
    'aria-label': t('settings.font_size'),
  }) as HTMLInputElement;
  fontSize.addEventListener('input', () => {
    const size = Number(fontSize.value);
    const cur = settingsStore.get();
    void persist({ ...cur, subtitles: { ...cur.subtitles, fontSize: size } });
    void mpv.setSubtitleFontSize(size);
  });

  fields.push(
    boolField(
      'settings.remember_position',
      (s) => s.playback.rememberPosition,
      (s, v) => ({
        ...s,
        playback: { ...s.playback, rememberPosition: v },
      }),
    ),
    boolField(
      'settings.hardware_decoding',
      (s) => s.playback.hardwareDecoding,
      (s, v) => ({
        ...s,
        playback: { ...s.playback, hardwareDecoding: v },
      }),
    ),
    boolField(
      'settings.autoplay_next',
      (s) => s.playback.autoplayNext,
      (s, v) => ({
        ...s,
        playback: { ...s.playback, autoplayNext: v },
      }),
    ),
    boolField(
      'settings.autoload',
      (s) => s.subtitles.autoload,
      (s, v) => ({
        ...s,
        subtitles: { ...s.subtitles, autoload: v },
      }),
    ),
    boolField(
      'settings.gestures_enabled',
      (s) => s.gestures.enabled,
      (s, v) => ({
        ...s,
        gestures: { ...s.gestures, enabled: v },
      }),
    ),
  );

  const setDefaultBtn = h(
    'button',
    { class: 'btn primary block', type: 'button', disabled: !inTauri },
    [t('settings.set_default')],
  );
  setDefaultBtn.addEventListener('click', async () => {
    try {
      const code = await assoc.registerDefaults();
      toast(t(code));
    } catch (e) {
      toast(describeError(e), 'error');
    }
  });

  const version = h('span', { class: 'about-value' }, ['—']);
  if (inTauri) {
    system
      .appInfo()
      .then((i) => (version.textContent = `${i.version} · ${i.os}/${i.arch}`))
      .catch(() => {});
  }

  const shortcutsList = h('div', { class: 'shortcuts-list' });
  const renderShortcuts = () => {
    const rows = currentBindings()
      .slice(0, 24)
      .map((b) =>
        h('div', { class: 'shortcut-row' }, [
          h('kbd', {}, [keyLabel(b.chord)]),
          h('span', {}, [b.action.replace(/_/g, ' ')]),
        ]),
      );
    shortcutsList.replaceChildren(...rows);
  };

  const header = h('header', { class: 'panel-header' }, [
    h('h2', {}, [t('settings.title')]),
    h(
      'button',
      {
        class: 'icon-btn small',
        type: 'button',
        'aria-label': t('settings.close'),
        onclick: () => uiStore.update({ settingsOpen: false }),
      },
      [icon('close')],
    ),
  ]);

  const field = (labelKey: string, control: HTMLElement) =>
    h('label', { class: 'settings-field' }, [h('span', {}, [t(labelKey)]), control]);

  const panel = h('aside', { class: 'panel settings-panel' }, [
    header,
    h('section', { class: 'tool-section' }, [
      field('settings.language', langSelect),
      field('settings.theme', themeSelect),
    ]),
    h('section', { class: 'tool-section' }, [
      h('h3', { class: 'tool-title' }, [t('settings.playback')]),
      ...fields.slice(0, 3).map((f) => f.row),
    ]),
    h('section', { class: 'tool-section' }, [
      h('h3', { class: 'tool-title' }, [t('settings.subtitles')]),
      fields[3].row,
      field('settings.font_size', fontSize),
    ]),
    h('section', { class: 'tool-section' }, [
      h('h3', { class: 'tool-title' }, [t('settings.gestures')]),
      fields[4].row,
    ]),
    h('section', { class: 'tool-section' }, [setDefaultBtn]),
    h('section', { class: 'tool-section' }, [
      h('h3', { class: 'tool-title' }, [t('settings.shortcuts')]),
      shortcutsList,
    ]),
    h('section', { class: 'tool-section about' }, [
      h('span', {}, [`${t('settings.version')}`]),
      version,
    ]),
  ]);

  settingsStore.subscribe((s) => {
    langSelect.value = s.language ?? SUPPORTED_LANGUAGES[0];
    themeSelect.value = s.theme;
    fontSize.value = String(s.subtitles.fontSize);
    for (const f of fields) f.sync(s);
  });
  uiStore.subscribe((ui) => {
    panel.classList.toggle('open', ui.settingsOpen);
    if (ui.settingsOpen) renderShortcuts();
  });
  return panel;
}

function keyLabel(chord: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }): string {
  const parts: string[] = [];
  if (chord.ctrl) parts.push('Ctrl');
  if (chord.shift) parts.push('Shift');
  if (chord.alt) parts.push('Alt');
  parts.push(chord.key === 'space' ? 'Space' : chord.key);
  return parts.join('+');
}
