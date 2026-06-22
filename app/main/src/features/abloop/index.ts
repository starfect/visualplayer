// A-B repeat: first press marks A, second marks B (loop active), third clears.

import { mpv } from '../../ipc/mpv';
import { playerStore } from '../../stores/player';
import { videoStore } from '../video/store';

export async function toggleAbLoop(): Promise<void> {
  const { abLoopA, abLoopB } = videoStore.get();
  const now = playerStore.get().timePos;
  if (abLoopA === null) {
    videoStore.update({ abLoopA: now });
    await mpv.setAbLoopA(now);
  } else if (abLoopB === null) {
    videoStore.update({ abLoopB: now });
    await mpv.setAbLoopB(now);
  } else {
    videoStore.update({ abLoopA: null, abLoopB: null });
    await mpv.setAbLoopA('no');
    await mpv.setAbLoopB('no');
  }
}

export function abLoopLabel(): string {
  const { abLoopA, abLoopB } = videoStore.get();
  if (abLoopA === null) return 'A–B';
  if (abLoopB === null) return 'A•';
  return 'A•B';
}
