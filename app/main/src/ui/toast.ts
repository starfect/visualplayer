// Minimal transient notifications. Backend errors arrive as `{ code, message }`
// (see vp-core error model); we translate the code via i18n.
import { h } from './dom';
import { t } from '../i18n';

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (!container) {
    container = h('div', { class: 'toast-container' });
    document.body.append(container);
  }
  return container;
}

/** Show a short-lived message. */
export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  const node = h('div', { class: `toast toast-${kind}`, role: 'status' }, [message]);
  ensureContainer().append(node);
  setTimeout(() => node.remove(), 3500);
}

/** Turn an unknown thrown value (incl. backend `{ code }`) into a readable string. */
export function describeError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    return t(code);
  }
  return err instanceof Error ? err.message : String(err);
}
