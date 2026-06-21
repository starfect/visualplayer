//! M3U / M3U8 playlist parsing and serialization.
//!
//! Pure and filesystem-free: callers read or write the file and resolve relative
//! paths against the playlist's directory. Both the simple form (one path or URL
//! per line) and the extended form (`#EXTM3U` with `#EXTINF:<seconds>,<title>`)
//! are supported.

use serde::{Deserialize, Serialize};

/// One entry parsed from, or written to, an M3U playlist.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct M3uEntry {
    /// Local path or URL exactly as it appears in the file.
    pub path: String,
    /// Display title from a preceding `#EXTINF` line, if any.
    pub title: Option<String>,
    /// Track length in whole seconds from `#EXTINF`; `-1` when unknown.
    pub duration: i64,
}

impl M3uEntry {
    pub fn new(path: impl Into<String>, title: Option<String>, duration: i64) -> Self {
        Self {
            path: path.into(),
            title,
            duration,
        }
    }
}

/// Parse the contents of an M3U/M3U8 file into entries.
///
/// Blank lines and comment lines other than `#EXTINF` are ignored, so the header
/// (`#EXTM3U`) and unknown directives never produce phantom entries.
pub fn parse(content: &str) -> Vec<M3uEntry> {
    let mut entries = Vec::new();
    let mut pending: Option<(i64, Option<String>)> = None;

    for raw in content.lines() {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(rest) = line.strip_prefix("#EXTINF:") {
            pending = Some(parse_extinf(rest));
            continue;
        }
        if line.starts_with('#') {
            continue;
        }
        let (duration, title) = pending.take().unwrap_or((-1, None));
        entries.push(M3uEntry::new(line.to_string(), title, duration));
    }
    entries
}

/// Serialize entries into extended-M3U text (always with an `#EXTM3U` header).
pub fn serialize(entries: &[M3uEntry]) -> String {
    let mut out = String::from("#EXTM3U\n");
    for entry in entries {
        let title = entry.title.as_deref().unwrap_or("");
        out.push_str(&format!("#EXTINF:{},{}\n{}\n", entry.duration, title, entry.path));
    }
    out
}

fn parse_extinf(rest: &str) -> (i64, Option<String>) {
    match rest.split_once(',') {
        Some((dur, title)) => {
            let seconds = dur.trim().parse::<i64>().unwrap_or(-1);
            let title = title.trim();
            (seconds, (!title.is_empty()).then(|| title.to_string()))
        }
        None => (rest.trim().parse::<i64>().unwrap_or(-1), None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_paths() {
        let entries = parse("a.mkv\nb.mp4\n");
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0], M3uEntry::new("a.mkv", None, -1));
        assert_eq!(entries[1].path, "b.mp4");
    }

    #[test]
    fn parses_extinf_title_and_duration() {
        let entries = parse("#EXTM3U\n#EXTINF:212,Artist - Song\n/music/song.flac\n");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].duration, 212);
        assert_eq!(entries[0].title.as_deref(), Some("Artist - Song"));
        assert_eq!(entries[0].path, "/music/song.flac");
    }

    #[test]
    fn ignores_blank_lines_and_unknown_directives() {
        let entries = parse("#EXTM3U\n\n#PLAYLIST:Mix\n\nhttp://host/stream\n");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].path, "http://host/stream");
    }

    #[test]
    fn extinf_without_title_is_none() {
        let entries = parse("#EXTINF:90,\nclip.webm\n");
        assert_eq!(entries[0].duration, 90);
        assert_eq!(entries[0].title, None);
    }

    #[test]
    fn extinf_binds_only_to_the_next_path() {
        let entries = parse("#EXTINF:10,One\nfirst.mp4\nsecond.mp4\n");
        assert_eq!(entries[0].title.as_deref(), Some("One"));
        assert_eq!(entries[1].title, None);
        assert_eq!(entries[1].duration, -1);
    }

    #[test]
    fn round_trips_through_serialize_and_parse() {
        let original = vec![
            M3uEntry::new("/a/movie.mkv", Some("Movie".into()), 5400),
            M3uEntry::new("https://host/live", None, -1),
        ];
        let text = serialize(&original);
        assert!(text.starts_with("#EXTM3U\n"));
        assert_eq!(parse(&text), original);
    }
}
