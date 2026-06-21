// Background task progress (downloads/convert/whisper) keyed by task id
// (BLUEPRINT §6.2/§7 `task://*`). Populated by `ipc/events.ts` in later milestones.
import { createStore } from './store';

export type TaskKind = 'download' | 'convert' | 'whisper';
export type TaskStatus = 'running' | 'done' | 'error' | 'cancelled';

export interface Task {
  id: string;
  kind: TaskKind;
  status: TaskStatus;
  percent: number;
  message?: string;
}

export interface TasksState {
  byId: Record<string, Task>;
}

export const tasksStore = createStore<TasksState>({ byId: {} });

export function upsertTask(task: Task): void {
  tasksStore.update({ byId: { ...tasksStore.get().byId, [task.id]: task } });
}
