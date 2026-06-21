// Chapter navigation: step between the chapters embedded in a file (MKV/MP4,
// DVD/Blu-ray rips) and expose their titles for the chapter list. Current
// chapter and chapter count are tracked live via observed mpv properties.

import { mpv } from '../../ipc/mpv';
import { chaptersStore } from '../../stores/chapters';

export const chapters = {
  next: () => mpv.addChapter(1),
  prev: () => mpv.addChapter(-1),
  goTo: (index: number) => mpv.setChapter(index),
  async refresh(): Promise<void> {
    const list = await mpv.chapterList();
    chaptersStore.update({
      count: list.length,
      titles: list.map((c, i) => c.title ?? `${i + 1}`),
    });
  },
};
