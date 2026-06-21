import { inTauri } from '../ipc/env';

export async function toggleFullscreen(): Promise<void> {
  if (!inTauri) {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
    return;
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  await win.setFullscreen(!(await win.isFullscreen()));
}

export async function exitFullscreen(): Promise<void> {
  if (!inTauri) {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    return;
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setFullscreen(false);
}
