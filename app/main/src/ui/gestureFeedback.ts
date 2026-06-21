import { h } from './dom';

let node: HTMLElement | null = null;
let timer: number | undefined;

export function showGestureFeedback(text: string): void {
  if (!node) {
    node = h('div', { class: 'gesture-feedback' });
    document.body.append(node);
  }
  node.textContent = text;
  node.classList.add('visible');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => node?.classList.remove('visible'), 700);
}
