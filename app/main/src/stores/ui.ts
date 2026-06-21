// Transient UI state: panel visibility and control-bar auto-hide (BLUEPRINT §11).
import { createStore } from './store';

export interface UiState {
  playlistOpen: boolean;
  settingsOpen: boolean;
  controlsVisible: boolean;
}

export const uiStore = createStore<UiState>({
  playlistOpen: false,
  settingsOpen: false,
  controlsVisible: true,
});
