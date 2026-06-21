// Minimal DOM helpers (no framework — BLUEPRINT §6.1).

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

/** Create an element with attributes (and `onclick`-style listeners) and children. */
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

/** Format seconds as `m:ss` or `h:mm:ss`. */
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
  settings:
    '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4 2-1.5-2-3.5-2.4 1a6.7 6.7 0 0 0-1.7-1L13 4h-2l-.9 2.5a6.7 6.7 0 0 0-1.7 1L6 6.5 4 10l2 1.5a6.8 6.8 0 0 0 0 1L4 14l2 3.5 2.4-1c.5.4 1.1.8 1.7 1L11 20h2l.9-2.5c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5a6.8 6.8 0 0 0 0-1z"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
  screenshot:
    '<svg viewBox="0 0 24 24"><path d="M9 4 7.2 6H4v14h16V6h-3.2L15 4zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>',
  close:
    '<svg viewBox="0 0 24 24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z"/></svg>',
};

/** Build an inline SVG icon span. */
export function icon(name: string): HTMLSpanElement {
  const span = h('span', { class: 'icon', 'aria-hidden': 'true' });
  span.innerHTML = ICONS[name] ?? '';
  return span;
}
