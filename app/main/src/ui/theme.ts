// Theme application (BLUEPRINT §11). `system` follows the OS via CSS media query;
// `light`/`dark` force a theme through a `data-theme` attribute on <html>.
import type { Theme } from '../ipc/types';

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}
