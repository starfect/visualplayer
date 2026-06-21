// TypeScript mirrors of the Rust IPC types (vp-core + Tauri commands). Keep these
// in sync with `vp-core/src/*` and `app/main/src-tauri/src/*` (BLUEPRINT §7).

export type SourceKind = 'local_file' | 'network_url' | 'web_video';

export interface MediaSource {
  kind: SourceKind;
  url: string;
  title: string | null;
  subtitles: string[];
  headers: Record<string, string>;
}

export interface LoadOptions {
  noSubtitleAutoload?: boolean;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlaylistItem {
  id: number;
  path: string;
  title: string | null;
}

export interface Playlist {
  items: PlaylistItem[];
  index: number | null;
  repeat: RepeatMode;
  shuffle: boolean;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  language: string | null;
  theme: Theme;
  defaultResolution: string | null;
  volume: number;
  speed: number;
  maxSimultaneous: number;
}

export interface YtVideo {
  url: string;
  preferred_resolution?: string;
  title?: string;
}

export interface WebVideo {
  url: string;
  headers?: Record<string, string>;
  title?: string;
}

export interface LicenseEntry {
  name: string;
  text: string;
}

/** Error shape returned by backend commands (`{ code, message }`). */
export interface BackendError {
  code: string;
  message: string;
}
