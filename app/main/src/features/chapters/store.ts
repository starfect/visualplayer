import { createStore } from '../../stores/store';

export interface ChaptersState {
  count: number;
  current: number;
  titles: string[];
}

export const chaptersStore = createStore<ChaptersState>({
  count: 0,
  current: -1,
  titles: [],
});
