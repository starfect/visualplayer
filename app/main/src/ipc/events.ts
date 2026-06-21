// Backend event subscriptions (BLUEPRINT §7 `task://*`). mpv property changes are
// handled in `mpv.ts`; this wires background-task progress into the tasks store.
// Listeners are no-ops outside Tauri and harmless before any task exists.

import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { inTauri } from './env';
import { upsertTask, type Task } from '../stores/tasks';

/** Subscribe to task progress/done/error events. Returns an unlisten function. */
export async function subscribeTaskEvents(): Promise<UnlistenFn> {
  if (!inTauri) return () => {};

  const unlisten = await Promise.all([
    listen<Task>('task://progress', (e) => upsertTask({ ...e.payload, status: 'running' })),
    listen<Task>('task://done', (e) => upsertTask({ ...e.payload, status: 'done', percent: 100 })),
    listen<Task>('task://error', (e) => upsertTask({ ...e.payload, status: 'error' })),
  ]);

  return () => unlisten.forEach((fn) => fn());
}
