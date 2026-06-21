// TypeScript mirrors of the Rust IPC types (vp-core + Tauri commands).

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

export interface PlaybackSettings {
  rememberPosition: boolean;
  hardwareDecoding: boolean;
  seekStepSeconds: number;
  seekStepLongSeconds: number;
  volumeStep: number;
  maxVolume: number;
  autoplayNext: boolean;
  pauseOnMinimize: boolean;
}

export interface SubtitleSettings {
  autoload: boolean;
  fontSize: number;
  color: string;
  borderSize: number;
  position: number;
  defaultDelay: number;
  bold: boolean;
}

export interface GestureSettings {
  enabled: boolean;
  seekEnabled: boolean;
  volumeEnabled: boolean;
  brightnessEnabled: boolean;
  doubleTapSeek: boolean;
  seekSensitivity: number;
}

export type Action =
  | 'toggle_play'
  | 'stop'
  | 'seek_forward'
  | 'seek_backward'
  | 'seek_forward_long'
  | 'seek_backward_long'
  | 'next_frame'
  | 'prev_frame'
  | 'volume_up'
  | 'volume_down'
  | 'toggle_mute'
  | 'toggle_fullscreen'
  | 'playlist_next'
  | 'playlist_prev'
  | 'speed_up'
  | 'speed_down'
  | 'speed_reset'
  | 'screenshot'
  | 'toggle_subtitles'
  | 'cycle_subtitle_track'
  | 'cycle_audio_track'
  | 'subtitle_delay_inc'
  | 'subtitle_delay_dec'
  | 'audio_delay_inc'
  | 'audio_delay_dec'
  | 'toggle_playlist_panel'
  | 'toggle_settings'
  | 'toggle_ab_loop'
  | 'cycle_aspect'
  | 'rotate'
  | 'zoom_in'
  | 'zoom_out'
  | 'zoom_reset'
  | 'jump_start'
  | 'jump_end'
  | 'next_chapter'
  | 'prev_chapter'
  | 'toggle_mini_player'
  | 'toggle_equalizer';

export interface KeyChord {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface Binding {
  chord: KeyChord;
  action: Action;
}

export interface Settings {
  language: string | null;
  theme: Theme;
  defaultResolution: string | null;
  volume: number;
  speed: number;
  maxSimultaneous: number;
  playback: PlaybackSettings;
  subtitles: SubtitleSettings;
  gestures: GestureSettings;
  keybindings: Binding[];
}

export interface HistoryEntry {
  path: string;
  title?: string;
  positionSeconds: number;
  durationSeconds: number;
  lastOpened: number;
}

export interface History {
  entries: HistoryEntry[];
}

export interface TorrentPlan {
  videoTorrent: string;
  subtitleTorrents: string[];
}

export interface TorrentResolution {
  plan: TorrentPlan;
  videoPath: string | null;
  subtitlePaths: string[];
  outputDir: string;
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

export interface AppInfo {
  name: string;
  version: string;
  os: string;
  arch: string;
}

export interface BackendError {
  code: string;
  message: string;
}

export interface TrackInfo {
  id: number;
  type: 'video' | 'audio' | 'sub';
  title?: string;
  lang?: string;
  selected: boolean;
  codec?: string;
}

export interface MediaInfo {
  filename: string | null;
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string | null;
  audioCodec: string | null;
  fps: number | null;
  tracks: TrackInfo[];
}
