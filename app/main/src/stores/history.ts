import { createStore } from './store';
import type { History } from '../ipc/types';

export const historyStore = createStore<History>({ entries: [] });
