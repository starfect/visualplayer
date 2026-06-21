//! `.torrent` classification and same-name video/subtitle pairing.
//!
//! A `movie.mp4.torrent` next to a `movie.srt.torrent` (or `movie.ko.srt.torrent`)
//! describes a video and its subtitle: both are fetched and the subtitle is
//! attached to the video. The matching is pure so it is fully unit-testable.

use std::path::{Path, PathBuf};

use crate::error::{Error, Result};
use crate::media::{self, MediaKind};

pub const TORRENT_SUFFIX: &str = ".torrent";

pub fn inner_name(file_name: &str) -> Option<&str> {
    file_name
        .strip_suffix(TORRENT_SUFFIX)
        .filter(|s| !s.is_empty())
}

pub fn inner_extension(file_name: &str) -> Option<String> {
    let inner = inner_name(file_name)?;
    let (_, ext) = inner.rsplit_once('.')?;
    if ext.is_empty() || ext.contains(['/', '\\']) {
        None
    } else {
        Some(ext.to_ascii_lowercase())
    }
}

pub fn inner_stem(file_name: &str) -> Option<&str> {
    let inner = inner_name(file_name)?;
    match inner.rsplit_once('.') {
        Some((stem, _)) if !stem.is_empty() => Some(stem),
        _ => Some(inner),
    }
}

pub fn torrent_kind(file_name: &str) -> MediaKind {
    match inner_extension(file_name) {
        Some(ext) => media::kind_from_ext(&ext),
        None => MediaKind::Unknown,
    }
}

pub fn is_video_torrent(file_name: &str) -> bool {
    torrent_kind(file_name) == MediaKind::Video
}

pub fn is_subtitle_torrent(file_name: &str) -> bool {
    torrent_kind(file_name) == MediaKind::Subtitle
}

fn stem_matches(candidate_stem: &str, base: &str) -> bool {
    candidate_stem.eq_ignore_ascii_case(base)
        || (candidate_stem.len() > base.len()
            && candidate_stem[..base.len()].eq_ignore_ascii_case(base)
            && candidate_stem.as_bytes()[base.len()] == b'.')
}

pub fn match_subtitle_torrents(video_torrent: &str, siblings: &[String]) -> Vec<String> {
    let Some(base) = inner_stem(video_torrent) else {
        return Vec::new();
    };
    siblings
        .iter()
        .filter(|name| name.as_str() != video_torrent)
        .filter(|name| is_subtitle_torrent(name))
        .filter(|name| inner_stem(name).is_some_and(|stem| stem_matches(stem, base)))
        .cloned()
        .collect()
}

pub fn discover_subtitle_torrents(video_torrent_path: &Path) -> Result<Vec<PathBuf>> {
    let file_name = video_torrent_path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or(Error::InvalidPath)?;
    let dir = video_torrent_path
        .parent()
        .unwrap_or_else(|| Path::new("."));

    let mut siblings = Vec::new();
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            if let Some(name) = entry.file_name().to_str() {
                siblings.push(name.to_string());
            }
        }
    }
    siblings.sort_unstable();

    Ok(match_subtitle_torrents(file_name, &siblings)
        .into_iter()
        .map(|name| dir.join(name))
        .collect())
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TorrentPlan {
    pub video_torrent: String,
    pub subtitle_torrents: Vec<String>,
}

pub fn plan_from_siblings(video_torrent: &str, siblings: &[String]) -> TorrentPlan {
    TorrentPlan {
        video_torrent: video_torrent.to_string(),
        subtitle_torrents: match_subtitle_torrents(video_torrent, siblings),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_inner_media() {
        assert!(is_video_torrent("movie.mp4.torrent"));
        assert!(is_subtitle_torrent("movie.srt.torrent"));
        assert_eq!(torrent_kind("song.flac.torrent"), MediaKind::Audio);
        assert_eq!(torrent_kind("plain.torrent"), MediaKind::Unknown);
    }

    #[test]
    fn pairs_same_name_subtitle_torrents() {
        let siblings = vec![
            "movie.mp4.torrent".to_string(),
            "movie.srt.torrent".to_string(),
            "movie.ko.ass.torrent".to_string(),
            "movie.mp3.torrent".to_string(),
            "other.srt.torrent".to_string(),
            "moviex.srt.torrent".to_string(),
        ];
        let got = match_subtitle_torrents("movie.mp4.torrent", &siblings);
        assert_eq!(got, vec!["movie.srt.torrent", "movie.ko.ass.torrent"]);
    }

    #[test]
    fn plan_collects_video_and_subs() {
        let siblings = vec![
            "ep01.mkv.torrent".to_string(),
            "ep01.en.srt.torrent".to_string(),
        ];
        let plan = plan_from_siblings("ep01.mkv.torrent", &siblings);
        assert_eq!(plan.subtitle_torrents, vec!["ep01.en.srt.torrent"]);
    }
}
