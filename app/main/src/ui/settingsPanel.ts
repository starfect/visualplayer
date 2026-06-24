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

/** A labelled control wrapper matching `.settings-field`. */
function field(labelKey: string, control: HTMLElement, hintKey?: string): HTMLElement {
  const children: (HTMLElement | string)[] = [h('span', {}, [t(labelKey)])];
  if (hintKey) children.push(h('small', { class: 'settings-hint' }, [t(hintKey)]));
  children.push(control);
  return h('label', { class: 'settings-field' }, children);
}

/** Toggle switch bound to a boolean setting, with optional live mpv apply. */
function boolField(
  labelKey: string,
  get: (s: Settings) => boolean,
  set: (s: Settings, v: boolean) => Settings,
  live?: (v: boolean) => void,
  hintKey?: string,
): Field {
  const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
  input.addEventListener('change', () => {
    void persist(set(settingsStore.get(), input.checked));
    live?.(input.checked);
  });
  const label = h('span', {}, [t(labelKey)]);
  const text = hintKey
    ? h('span', { class: 'settings-toggle-text' }, [
        label,
        h('small', { class: 'settings-hint' }, [t(hintKey)]),
      ])
    : label;
  const row = h('label', { class: 'settings-toggle' }, [text, input]);
  return { row, sync: (s) => (input.checked = get(s)) };
}

/** A slider with a live numeric badge. */
function rangeField(
  labelKey: string,
  opts: { min: number; max: number; step: number; fmt?: (n: number) => string },
  get: (s: Settings) => number,
  set: (s: Settings, v: number) => Settings,
  live?: (v: number) => void,
): Field {
  const fmt = opts.fmt ?? ((n: number) => String(n));
  const input = h('input', {
    type: 'range',
    min: String(opts.min),
    max: String(opts.max),
    step: String(opts.step),
    'aria-label': t(labelKey),
  }) as HTMLInputElement;
  const badge = h('span', { class: 'range-value' }, [fmt(get(settingsStore.get()))]);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    badge.textContent = fmt(v);
    void persist(set(settingsStore.get(), v));
    live?.(v);
  });
  const row = field(labelKey, h('div', { class: 'tool-row' }, [input, badge]));
  return {
    row,
    sync: (s) => {
      input.value = String(get(s));
      badge.textContent = fmt(get(s));
    },
  };
}

/** A dropdown bound to a string setting. */
function selectField(
  labelKey: string,
  options: { value: string; label: string }[],
  get: (s: Settings) => string,
  set: (s: Settings, v: string) => Settings,
  live?: (v: string) => void,
): Field {
  const select = h(
    'select',
    { class: 'settings-select' },
    options.map((o) => h('option', { value: o.value }, [o.label])),
  ) as HTMLSelectElement;
  select.addEventListener('change', () => {
    void persist(set(settingsStore.get(), select.value));
    live?.(select.value);
  });
  return { row: field(labelKey, select), sync: (s) => (select.value = get(s)) };
}

/** A colour picker bound to a hex string setting. */
function colorField(
  labelKey: string,
  get: (s: Settings) => string,
  set: (s: Settings, v: string) => Settings,
  live?: (v: string) => void,
): Field {
  const input = h('input', { type: 'color', class: 'settings-color' }) as HTMLInputElement;
  input.addEventListener('input', () => {
    void persist(set(settingsStore.get(), input.value));
    live?.(input.value);
  });
  return { row: field(labelKey, input), sync: (s) => (input.value = get(s)) };
}

function section(titleKey: string | null, rows: HTMLElement[]): HTMLElement {
  const children = titleKey ? [h('h3', { class: 'tool-title' }, [t(titleKey)]), ...rows] : rows;
  return h('section', { class: 'tool-section' }, children);
}

export function createSettingsPanel(): HTMLElement {
  const all: Field[] = [];
  const track = <T extends Field>(f: T): T => {
    all.push(f);
    return f;
  };

  // ---- Interface --------------------------------------------------------
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

  // ---- Playback ---------------------------------------------------------
  const playbackFields = [
    track(
      boolField(
        'settings.remember_position',
        (s) => s.playback.rememberPosition,
        (s, v) => ({ ...s, playback: { ...s.playback, rememberPosition: v } }),
      ),
    ),
    track(
      boolField(
        'settings.autoplay_next',
        (s) => s.playback.autoplayNext,
        (s, v) => ({ ...s, playback: { ...s.playback, autoplayNext: v } }),
      ),
    ),
    track(
      boolField(
        'settings.loop_file',
        (s) => s.playback.loopFile,
        (s, v) => ({ ...s, playback: { ...s.playback, loopFile: v } }),
        (v) => void mpv.setLoopFile(v),
      ),
    ),
    track(
      boolField(
        'settings.pause_on_minimize',
        (s) => s.playback.pauseOnMinimize,
        (s, v) => ({ ...s, playback: { ...s.playback, pauseOnMinimize: v } }),
      ),
    ),
    track(
      boolField(
        'settings.hardware_decoding',
        (s) => s.playback.hardwareDecoding,
        (s, v) => ({ ...s, playback: { ...s.playback, hardwareDecoding: v } }),
        undefined,
        'settings.restart_required',
      ),
    ),
    track(
      selectField(
        'settings.default_speed',
        ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2', '3', '4'].map((v) => ({
          value: v,
          label: `${v}×`,
        })),
        (s) => String(s.playback.defaultSpeed),
        (s, v) => ({ ...s, playback: { ...s.playback, defaultSpeed: Number(v) } }),
        (v) => void mpv.setSpeed(Number(v)),
      ),
    ),
    track(
      rangeField(
        'settings.seek_step',
        { min: 1, max: 60, step: 1, fmt: (n) => `${n}s` },
        (s) => s.playback.seekStepSeconds,
        (s, v) => ({ ...s, playback: { ...s.playback, seekStepSeconds: v } }),
      ),
    ),
    track(
      rangeField(
        'settings.seek_step_long',
        { min: 5, max: 300, step: 5, fmt: (n) => `${n}s` },
        (s) => s.playback.seekStepLongSeconds,
        (s, v) => ({ ...s, playback: { ...s.playback, seekStepLongSeconds: v } }),
      ),
    ),
    track(
      rangeField(
        'settings.volume_step',
        { min: 1, max: 25, step: 1, fmt: (n) => `${n}%` },
        (s) => s.playback.volumeStep,
        (s, v) => ({ ...s, playback: { ...s.playback, volumeStep: v } }),
      ),
    ),
    track(
      rangeField(
        'settings.max_volume',
        { min: 100, max: 300, step: 10, fmt: (n) => `${n}%` },
        (s) => s.playback.maxVolume,
        (s, v) => ({ ...s, playback: { ...s.playback, maxVolume: v } }),
      ),
    ),
  ];

  // ---- Video ------------------------------------------------------------
  const videoFields = [
    track(
      selectField(
        'settings.aspect_ratio',
        [
          { value: '-1', label: t('settings.aspect_default') },
          { value: '16:9', label: '16:9' },
          { value: '4:3', label: '4:3' },
          { value: '21:9', label: '21:9' },
          { value: '2.35:1', label: '2.35:1' },
          { value: '1:1', label: '1:1' },
        ],
        (s) => s.video.aspectRatio,
        (s, v) => ({ ...s, video: { ...s.video, aspectRatio: v } }),
        (v) => void mpv.setAspect(v),
      ),
    ),
    track(
      boolField(
        'settings.deinterlace',
        (s) => s.video.deinterlace,
        (s, v) => ({ ...s, video: { ...s.video, deinterlace: v } }),
        (v) => void mpv.setDeinterlace(v),
      ),
    ),
    track(
      selectField(
        'settings.snapshot_format',
        ['png', 'jpg', 'webp'].map((v) => ({ value: v, label: v.toUpperCase() })),
        (s) => s.video.snapshotFormat,
        (s, v) => ({ ...s, video: { ...s.video, snapshotFormat: v } }),
        (v) => void mpv.setSnapshotFormat(v),
      ),
    ),
  ];

  // ---- Audio & streaming -----------------------------------------------
  const audioFields = [
    track(
      rangeField(
        'settings.default_volume',
        { min: 0, max: 100, step: 1, fmt: (n) => `${n}%` },
        (s) => s.volume,
        (s, v) => ({ ...s, volume: v }),
        (v) => void mpv.setVolume(v),
      ),
    ),
    track(
      selectField(
        'settings.default_resolution',
        [
          { value: '', label: t('settings.resolution_auto') },
          { value: '2160', label: '2160p' },
          { value: '1440', label: '1440p' },
          { value: '1080', label: '1080p' },
          { value: '720', label: '720p' },
          { value: '480', label: '480p' },
          { value: '360', label: '360p' },
        ],
        (s) => s.defaultResolution ?? '',
        (s, v) => ({ ...s, defaultResolution: v === '' ? null : v }),
      ),
    ),
    track(
      rangeField(
        'settings.max_simultaneous',
        { min: 1, max: 16, step: 1 },
        (s) => s.maxSimultaneous,
        (s, v) => ({ ...s, maxSimultaneous: v }),
      ),
    ),
  ];

  // ---- Subtitles --------------------------------------------------------
  const subtitleFields = [
    track(
      boolField(
        'settings.autoload',
        (s) => s.subtitles.autoload,
        (s, v) => ({ ...s, subtitles: { ...s.subtitles, autoload: v } }),
      ),
    ),
    track(
      rangeField(
        'settings.font_size',
        { min: 16, max: 120, step: 2 },
        (s) => s.subtitles.fontSize,
        (s, v) => ({ ...s, subtitles: { ...s.subtitles, fontSize: v } }),
        (v) => void mpv.setSubtitleFontSize(v),
      ),
    ),
    track(
      colorField(
        'settings.subtitle_color',
        (s) => s.subtitles.color,
        (s, v) => ({ ...s, subtitles: { ...s.subtitles, color: v } }),
        (v) => void mpv.setSubtitleColor(v),
      ),
    ),
    track(
      boolField(
        'settings.subtitle_bold',
        (s) => s.subtitles.bold,
        (s, v) => ({ ...s, subtitles: { ...s.subtitles, bold: v } }),
        (v) => void mpv.setSubtitleBold(v),
      ),
    ),
    track(
      rangeField(
        'settings.subtitle_border',
        { min: 0, max: 10, step: 0.5, fmt: (n) => n.toFixed(1) },
        (s) => s.subtitles.borderSize,
        (s, v) => ({ ...s, subtitles: { ...s.subtitles, borderSize: v } }),
        (v) => void mpv.setSubtitleBorderSize(v),
      ),
    ),
    track(
      rangeField(
        'settings.subtitle_position',
        { min: 0, max: 150, step: 1 },
        (s) => s.subtitles.position,
        (s, v) => ({ ...s, subtitles: { ...s.subtitles, position: v } }),
        (v) => void mpv.setSubtitlePos(v),
      ),
    ),
    track(
      rangeField(
        'settings.subtitle_delay',
        { min: -10, max: 10, step: 0.1, fmt: (n) => `${n.toFixed(1)}s` },
        (s) => s.subtitles.defaultDelay,
        (s, v) => ({ ...s, subtitles: { ...s.subtitles, defaultDelay: v } }),
        (v) => void mpv.setSubtitleDelay(v),
      ),
    ),
  ];

  // ---- Gestures ---------------------------------------------------------
  const gestureFields = [
    track(
      boolField(
        'settings.gestures_enabled',
        (s) => s.gestures.enabled,
        (s, v) => ({ ...s, gestures: { ...s.gestures, enabled: v } }),
      ),
    ),
    track(
      boolField(
        'settings.gesture_seek',
        (s) => s.gestures.seekEnabled,
        (s, v) => ({ ...s, gestures: { ...s.gestures, seekEnabled: v } }),
      ),
    ),
    track(
      boolField(
        'settings.gesture_volume',
        (s) => s.gestures.volumeEnabled,
        (s, v) => ({ ...s, gestures: { ...s.gestures, volumeEnabled: v } }),
      ),
    ),
    track(
      boolField(
        'settings.gesture_brightness',
        (s) => s.gestures.brightnessEnabled,
        (s, v) => ({ ...s, gestures: { ...s.gestures, brightnessEnabled: v } }),
      ),
    ),
    track(
      boolField(
        'settings.gesture_double_tap',
        (s) => s.gestures.doubleTapSeek,
        (s, v) => ({ ...s, gestures: { ...s.gestures, doubleTapSeek: v } }),
      ),
    ),
    track(
      rangeField(
        'settings.gesture_sensitivity',
        { min: 0.25, max: 4, step: 0.25, fmt: (n) => `${n.toFixed(2)}×` },
        (s) => s.gestures.seekSensitivity,
        (s, v) => ({ ...s, gestures: { ...s.gestures, seekSensitivity: v } }),
      ),
    ),
  ];

  // ---- Default player ---------------------------------------------------
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

  const panel = h('aside', { class: 'panel settings-panel' }, [
    header,
    section('settings.interface', [
      field('settings.language', langSelect),
      field('settings.theme', themeSelect),
    ]),
    section(
      'settings.playback',
      playbackFields.map((f) => f.row),
    ),
    section(
      'settings.video',
      videoFields.map((f) => f.row),
    ),
    section(
      'settings.audio',
      audioFields.map((f) => f.row),
    ),
    section(
      'settings.subtitles',
      subtitleFields.map((f) => f.row),
    ),
    section(
      'settings.gestures',
      gestureFields.map((f) => f.row),
    ),
    section(null, [setDefaultBtn]),
    section('settings.shortcuts', [shortcutsList]),
    h('section', { class: 'tool-section about' }, [
      h('span', {}, [`${t('settings.version')}`]),
      version,
    ]),
  ]);

  settingsStore.subscribe((s) => {
    langSelect.value = s.language ?? SUPPORTED_LANGUAGES[0];
    themeSelect.value = s.theme;
    for (const f of all) f.sync(s);
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
