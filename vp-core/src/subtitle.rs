//! Same-name external subtitle discovery (BLUEPRINT §9.3).
//!
//! Matching is exposed as a **pure** function over file names so it can be tested
//! without touching the filesystem; a thin `discover_subtitles` convenience reads
//! a real directory.

use std::path::{Path, PathBuf};

use crate::error::{Error, Result};

/// Subtitle extensions recognized for auto-attach (BLUEPRINT §8.2). `.ass/.ssa`
/// and `.srt/.vtt` are first-class; the rest are best-effort via mpv/FFmpeg.
pub const SUBTITLE_EXTENSIONS: &[&str] = &[
    "srt", "ass", "ssa", "vtt", "sub", "idx", "sup", "smi", "sami", "ttml", "dfxp", "stl", "xml",
    "sbv", "lrc", "usf", "rt", "pjs", "aqt", "jss", "txt",
];

/// `true` if `ext` (without the dot, any case) is a known subtitle extension.
pub fn is_subtitle_ext(ext: &str) -> bool {
    let e = ext.trim_start_matches('.').to_ascii_lowercase();
    SUBTITLE_EXTENSIONS.contains(&e.as_str())
}

/// From a media file name and its sibling file names, return the siblings that
/// are same-stem subtitles.
///
/// A sibling matches when its extension is a subtitle extension and its stem is
/// either exactly the media stem (`movie.srt`) or the media stem followed by a
/// language/flag tag (`movie.en.srt`, `movie.forced.srt`). The media file itself
/// is never returned. Results preserve the input order.
pub fn match_sibling_subtitles(media_file_name: &str, siblings: &[String]) -> Vec<String> {
    let media_stem = file_stem(media_file_name);
    if media_stem.is_empty() {
        return Vec::new();
    }
    siblings
        .iter()
        .filter(|name| name.as_str() != media_file_name)
        .filter(|name| {
            let Some((stem, ext)) = name.rsplit_once('.') else {
                return false;
            };
            is_subtitle_ext(ext)
                && (stem.eq_ignore_ascii_case(media_stem)
                    || stem.len() > media_stem.len()
                        && stem[..media_stem.len()].eq_ignore_ascii_case(media_stem)
                        && stem.as_bytes()[media_stem.len()] == b'.')
        })
        .cloned()
        .collect()
}

/// Find same-name subtitle files next to `media_path` on disk.
pub fn discover_subtitles(media_path: &Path) -> Result<Vec<PathBuf>> {
    let file_name = media_path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or(Error::InvalidPath)?;
    let dir = media_path.parent().unwrap_or_else(|| Path::new("."));

    let mut siblings: Vec<String> = Vec::new();
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            if let Some(name) = entry.file_name().to_str() {
                siblings.push(name.to_string());
            }
        }
    }
    siblings.sort_unstable();

    Ok(match_sibling_subtitles(file_name, &siblings)
        .into_iter()
        .map(|name| dir.join(name))
        .collect())
}

/// The stem of a file name (everything before the last dot), or the whole name
/// when there is no extension.
fn file_stem(file_name: &str) -> &str {
    match file_name.rsplit_once('.') {
        Some((stem, _)) if !stem.is_empty() => stem,
        _ => file_name,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_extensions() {
        assert!(is_subtitle_ext("srt"));
        assert!(is_subtitle_ext(".ASS"));
        assert!(!is_subtitle_ext("mkv"));
    }

    #[test]
    fn matches_exact_and_language_tagged() {
        let siblings = vec![
            "movie.mkv".to_string(),
            "movie.srt".to_string(),
            "movie.ass".to_string(),
            "movie.en.srt".to_string(),
            "movie.ko.vtt".to_string(),
            "other.srt".to_string(),
            "moviex.srt".to_string(),
            "movie.jpg".to_string(),
        ];
        let got = match_sibling_subtitles("movie.mkv", &siblings);
        assert_eq!(
            got,
            vec!["movie.srt", "movie.ass", "movie.en.srt", "movie.ko.vtt"]
        );
    }

    #[test]
    fn does_not_match_self_or_unrelated() {
        let siblings = vec!["a.srt".to_string(), "b.mkv".to_string()];
        assert!(match_sibling_subtitles("b.mkv", &siblings).is_empty());
    }
}
