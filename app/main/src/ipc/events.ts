// Backend task events (task://progress|done|error). Updates the tasks store and,
// when Whisper finishes, auto-attaches the generated subtitle.

import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { inTauri } from './env';
import { mpv } from './mpv';
import { upsertTask, type Task } from '../stores/tasks';
import { toast } from '../ui/toast';
import { t } from '../i18n';

interface TaskPayload extends Task {
  output?: string;
}

export async function subscribeTaskEvents(): Promise<UnlistenFn> {
  if (!inTauri) return () => {};

  const unlisten = await Promise.all([
    listen<TaskPayload>('task://progress', (e) => upsertTask({ ...e.payload, status: 'running' })),
    listen<TaskPayload>('task://done', (e) => {
      upsertTask({ ...e.payload, status: 'done', percent: 100 });
      if (e.payload.kind === 'whisper' && e.payload.output) {
        void mpv.addSubtitle(e.payload.output);
        toast(t('subtitle.title'));
      } else {
        toast(t('task.done'));
      }
    }),
    listen<TaskPayload>('task://error', (e) => {
      upsertTask({ ...e.payload, status: 'error' });
      toast(e.payload.message ?? t('task.error'), 'error');
    }),
  ]);

  return () => unlisten.forEach((fn) => fn());
}
