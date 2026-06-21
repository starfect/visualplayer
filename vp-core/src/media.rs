//! Media classification by file extension shared across the app.

use std::path::Path;

use crate::subtitle::SUBTITLE_EXTENSIONS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MediaKind {
    Video,
    Audio,
    Subtitle,
    Playlist,
    Unknown,
}

pub const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "3gp", "3g2", "ts", "mts", "m2ts",
    "mpg", "mpeg", "vob", "ogv", "rm", "rmvb", "asf", "divx", "f4v", "amv", "drc", "qt", "mxf",
    "nut", "y4m", "dat", "m2v", "mpv", "vp8", "vp9", "ogm",
];

pub const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "aac", "m4a", "m4b", "opus", "ogg", "oga", "wma", "ac3", "eac3", "dts", "flac", "alac",
    "ape", "wv", "tta", "tak", "wav", "aiff", "aif", "mka", "mp2", "amr", "mpc", "spx", "caf",
    "dsf", "dff", "ra",
];

pub const PLAYLIST_EXTENSIONS: &[&str] =
    &["m3u", "m3u8", "pls", "xspf", "cue", "ytvideo", "webvideo"];

pub fn kind_from_ext(ext: &str) -> MediaKind {
    let e = ext.trim_start_matches('.').to_ascii_lowercase();
    if VIDEO_EXTENSIONS.contains(&e.as_str()) {
        MediaKind::Video
    } else if AUDIO_EXTENSIONS.contains(&e.as_str()) {
        MediaKind::Audio
    } else if SUBTITLE_EXTENSIONS.contains(&e.as_str()) {
        MediaKind::Subtitle
    } else if PLAYLIST_EXTENSIONS.contains(&e.as_str()) {
        MediaKind::Playlist
    } else {
        MediaKind::Unknown
    }
}

pub fn kind_from_name(file_name: &str) -> MediaKind {
    match file_name.rsplit_once('.') {
        Some((_, ext)) => kind_from_ext(ext),
        None => MediaKind::Unknown,
    }
}

pub fn kind_from_path(path: &Path) -> MediaKind {
    path.extension()
        .and_then(|e| e.to_str())
        .map(kind_from_ext)
        .unwrap_or(MediaKind::Unknown)
}

pub fn is_playable(kind: MediaKind) -> bool {
    matches!(kind, MediaKind::Video | MediaKind::Audio)
}

pub fn all_media_extensions() -> Vec<&'static str> {
    VIDEO_EXTENSIONS
        .iter()
        .chain(AUDIO_EXTENSIONS.iter())
        .copied()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_by_extension() {
        assert_eq!(kind_from_ext("MKV"), MediaKind::Video);
        assert_eq!(kind_from_ext(".flac"), MediaKind::Audio);
        assert_eq!(kind_from_name("movie.srt"), MediaKind::Subtitle);
        assert_eq!(kind_from_name("list.m3u8"), MediaKind::Playlist);
        assert_eq!(kind_from_name("readme"), MediaKind::Unknown);
    }

    #[test]
    fn playable_only_av() {
        assert!(is_playable(MediaKind::Video));
        assert!(is_playable(MediaKind::Audio));
        assert!(!is_playable(MediaKind::Subtitle));
    }
}
