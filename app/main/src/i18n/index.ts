// Lightweight, framework-free i18n loader. English (`en`) is the source of truth;
// missing keys fall back to English, then to the key. Supports `{var}` interpolation.

import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';

type Dict = Record<string, string>;

const DICTS: Record<string, Dict> = { en: en as Dict, ko: ko as Dict, ja: ja as Dict };

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = Object.keys(DICTS);

let current = DEFAULT_LANGUAGE;
let dict: Dict = DICTS[DEFAULT_LANGUAGE];

/** Normalize a tag like `ko-KR` to its supported primary subtag, or `en`. */
function normalize(lang: string | null | undefined): string {
  const primary = (lang ?? '').split(/[-_]/)[0].toLowerCase();
  return DICTS[primary] ? primary : DEFAULT_LANGUAGE;
}

/** The active language code. */
export function getLanguage(): string {
  return current;
}

/** Translate `key`, interpolating `{var}` placeholders from `vars`. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let str = dict[key] ?? DICTS[DEFAULT_LANGUAGE][key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replaceAll(`{${name}}`, String(value));
    }
  }
  return str;
}

/**
 * Apply translations to elements carrying `data-i18n` (text), `data-i18n-title`
 * (tooltip), or `data-i18n-aria` (aria-label) under `root`.
 */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n as string);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((node) => {
    node.title = t(node.dataset.i18nTitle as string);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAria as string));
  });
}

/** Set the active language (falls back to `en`) and re-apply translations. */
export function setLanguage(lang: string | null | undefined): string {
  current = normalize(lang);
  dict = DICTS[current];
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
    applyTranslations();
  }
  return current;
}
