// Subtitle overlay drawn above the video, fed by mpv's `sub-text` (BLUEPRINT §9.3).
import { playerStore } from '../stores/player';
import { h } from './dom';

export function createSubtitleOverlay(): HTMLElement {
  const text = h('div', { class: 'subtitle-text' });
  const layer = h('div', { class: 'subtitle-layer' }, [text]);

  playerStore.subscribe((state) => {
    text.textContent = state.subText;
    layer.classList.toggle('visible', state.subText.length > 0);
  });
  return layer;
}
