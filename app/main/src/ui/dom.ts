// Minimal DOM helpers (no framework).

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      node.className = String(value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) node.append(child);
  return node;
}

export function formatTime(totalSeconds: number): string {
  const total = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const s = Math.floor(total % 60);
  const m = Math.floor((total / 60) % 60);
  const hrs = Math.floor(total / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const ICONS: Record<string, string> = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
  volume:
    '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9zm12 3a4 4 0 0 0-2.5-3.7v7.4A4 4 0 0 0 16 12z"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9zm15 3 2-2-1.2-1.2L17 9.8 14.2 7 13 8.2 15.8 11 13 13.8 14.2 15 17 12.2 19.8 15 21 13.8z"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
  screenshot:
    '<svg viewBox="0 0 24 24"><path d="M9 4 7.2 6H4v14h16V6h-3.2L15 4zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>',
  close:
    '<svg viewBox="0 0 24 24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9.4 4-2 1.2.2 2.3-2.2.9-1.4 1.8-2.3-.5-2 1.2-2-1.2-2.3.5-1.4-1.8-2.2-.9.2-2.3-2-1.2 2-1.2-.2-2.3 2.2-.9 1.4-1.8 2.3.5 2-1.2 2 1.2 2.3-.5 1.4 1.8 2.2.9-.2 2.3z"/></svg>',
  subtitle:
    '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 8v2h6v-2zm8 0v2h4v-2zM6 15v2h10v-2zm12 0v2h0v-2z"/></svg>',
  tools:
    '<svg viewBox="0 0 24 24"><path d="M4 6h10v2H4zm12 0h4v2h-4zM4 11h4v2H4zm6 0h10v2H10zM4 16h10v2H4zm12 0h4v2h-4z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5zm2 2v4h8V5zm5 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>',
  load: '<svg viewBox="0 0 24 24"><path d="M12 3v9.6l3.3-3.3L16.7 11 12 15.7 7.3 11l1.4-1.7L12 12.6V3zM5 19h14v2H5z"/></svg>',
  pip: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zm10 5v5h6v-5z"/></svg>',
  chapter: '<svg viewBox="0 0 24 24"><path d="M4 5h2v14H4zm14 0h2v14h-2zM8 7l8 5-8 5z"/></svg>',
  equalizer:
    '<svg viewBox="0 0 24 24"><path d="M7 4h2v6H7zm0 8h2v8H7zM11 4h2v12h-2zm0 14h2v2h-2zM15 4h2v4h-2zm0 6h2v10h-2z"/></svg>',
};

export function icon(name: string): HTMLSpanElement {
  const span = h('span', { class: 'icon', 'aria-hidden': 'true' });
  span.innerHTML = ICONS[name] ?? '';
  return span;
}

export function iconButton(
  i18nKey: string,
  iconName: string,
  onClick: () => void,
  translate: (k: string) => string,
  extraClass = '',
): HTMLButtonElement {
  return h(
    'button',
    {
      class: `icon-btn ${extraClass}`.trim(),
      type: 'button',
      title: translate(i18nKey),
      'aria-label': translate(i18nKey),
      onclick: onClick,
    },
    [icon(iconName)],
  );
}
