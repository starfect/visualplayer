import { createStore } from './store';

export interface UiState {
  playlistOpen: boolean;
  settingsOpen: boolean;
  toolsOpen: boolean;
  controlsVisible: boolean;
}

export const uiStore = createStore<UiState>({
  playlistOpen: false,
  settingsOpen: false,
  toolsOpen: false,
  controlsVisible: true,
});

export function closePanels(): void {
  uiStore.update({ playlistOpen: false, settingsOpen: false, toolsOpen: false });
}
