// Mini-player: a compact, always-on-top window that floats over other apps so a
// video can keep playing in a corner. Toggling restores the previous size.

import { inTauri } from '../../ipc/env';
import { uiStore } from '../../stores/ui';

const MINI_WIDTH = 480;
const MINI_HEIGHT = 300;

let restoreSize: { width: number; height: number } | null = null;

export async function toggleMiniPlayer(): Promise<void> {
  const active = !uiStore.get().miniPlayer;
  uiStore.update({ miniPlayer: active });
  if (!inTauri) return;

  const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  await win.setAlwaysOnTop(active);

  if (active) {
    const size = await win.innerSize();
    const factor = await win.scaleFactor();
    restoreSize = { width: size.width / factor, height: size.height / factor };
    await win.setSize(new LogicalSize(MINI_WIDTH, MINI_HEIGHT));
  } else if (restoreSize) {
    await win.setSize(new LogicalSize(restoreSize.width, restoreSize.height));
    restoreSize = null;
  }
}
