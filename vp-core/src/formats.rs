//! Parsers for VisualPlayer's custom link files (BLUEPRINT §10).
//!
//! Each format accepts a **minimal** form (a single URL line, `#` comments
//! allowed) and an **extended** TOML form with optional metadata. Contents are
//! treated strictly as data (BLUEPRINT §17) — nothing here executes anything.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};

/// Parsed `.ytvideo` file: a YouTube link plus optional preferences (§10.2).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct YtVideo {
    /// The YouTube watch/short URL.
    pub url: String,
    /// Preferred resolution, e.g. `"1080p"` (optional).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preferred_resolution: Option<String>,
    /// Optional display title.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

/// Parsed `.webvideo` file: a direct media URL plus optional request headers (§10.3).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WebVideo {
    /// Direct media or playlist URL (http/https/HLS).
    pub url: String,
    /// Optional request headers (e.g. `Referer`) passed through to mpv.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub headers: BTreeMap<String, String>,
    /// Optional display title.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

/// Parse a `.ytvideo` file (minimal single-URL line or extended TOML).
pub fn parse_ytvideo(content: &str) -> Result<YtVideo> {
    if let Some(parsed) = try_toml::<YtVideo>(content) {
        let v = parsed?;
        validate_http_url(&v.url)?;
        return Ok(v);
    }
    let url = first_url_line(content)?;
    Ok(YtVideo {
        url,
        preferred_resolution: None,
        title: None,
    })
}

/// Parse a `.webvideo` file (minimal single-URL line or extended TOML).
pub fn parse_webvideo(content: &str) -> Result<WebVideo> {
    if let Some(parsed) = try_toml::<WebVideo>(content) {
        let v = parsed?;
        validate_http_url(&v.url)?;
        return Ok(v);
    }
    let url = first_url_line(content)?;
    Ok(WebVideo {
        url,
        headers: BTreeMap::new(),
        title: None,
    })
}

/// For `name.ext.torrent`, return the inner media extension hint (`"mp4"`), if any.
///
/// Example: `movie.mp4.torrent` -> `Some("mp4")` (BLUEPRINT §10.1). Returns
/// `None` for a plain `name.torrent`.
pub fn torrent_media_hint(file_name: &str) -> Option<String> {
    let stem = file_name.strip_suffix(".torrent")?;
    let (_, ext) = stem.rsplit_once('.')?;
    if ext.is_empty() || ext.contains(['/', '\\']) {
        None
    } else {
        Some(ext.to_ascii_lowercase())
    }
}

/// `true` if `url` looks like a YouTube watch/short link (BLUEPRINT §10.2).
pub fn is_youtube_url(url: &str) -> bool {
    let u = url.trim().to_ascii_lowercase();
    u.starts_with("https://youtu.be/")
        || u.starts_with("https://www.youtube.com/watch")
        || u.starts_with("https://youtube.com/watch")
        || u.starts_with("https://m.youtube.com/watch")
}

/// Only attempt TOML parsing when the content actually looks like `key = value`
/// TOML; a bare URL line is not valid TOML and should fall through to the
/// minimal parser. Returns `None` when it does not look like TOML at all.
fn try_toml<T: for<'de> Deserialize<'de>>(content: &str) -> Option<Result<T>> {
    let looks_like_toml = content.lines().any(|line| {
        let l = line.trim();
        !l.is_empty() && !l.starts_with('#') && {
            // a `key = ...` assignment before any URL scheme
            match l.split_once('=') {
                Some((key, _)) => {
                    let k = key.trim();
                    !k.is_empty() && k.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
                }
                None => false,
            }
        }
    });
    if !looks_like_toml {
        return None;
    }
    Some(toml::from_str::<T>(content).map_err(Error::from))
}

/// First non-empty, non-comment line that is an http(s) URL.
fn first_url_line(content: &str) -> Result<String> {
    for line in content.lines() {
        let l = line.trim();
        if l.is_empty() || l.starts_with('#') {
            continue;
        }
        validate_http_url(l)?;
        return Ok(l.to_string());
    }
    Err(Error::Parse("no URL found in file".into()))
}

fn validate_http_url(url: &str) -> Result<()> {
    let u = url.trim();
    if u.starts_with("http://") || u.starts_with("https://") {
        Ok(())
    } else {
        Err(Error::UnsupportedFormat(format!(
            "expected http(s) URL, got: {u}"
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ytvideo_minimal() {
        let v = parse_ytvideo("https://youtu.be/XXXXXXXXXXX\n").unwrap();
        assert_eq!(v.url, "https://youtu.be/XXXXXXXXXXX");
        assert!(v.preferred_resolution.is_none());
        assert!(is_youtube_url(&v.url));
    }

    #[test]
    fn ytvideo_minimal_skips_comments() {
        let v = parse_ytvideo("# my link\n\nhttps://youtu.be/abc\n").unwrap();
        assert_eq!(v.url, "https://youtu.be/abc");
    }

    #[test]
    fn ytvideo_extended_toml() {
        let toml = r#"
            url = "https://www.youtube.com/watch?v=XXXXXXXXXXX"
            preferred_resolution = "1080p"
            title = "Example"
        "#;
        let v = parse_ytvideo(toml).unwrap();
        assert_eq!(v.preferred_resolution.as_deref(), Some("1080p"));
        assert_eq!(v.title.as_deref(), Some("Example"));
    }

    #[test]
    fn webvideo_minimal_and_extended() {
        let m = parse_webvideo("https://example.com/example.mp4").unwrap();
        assert_eq!(m.url, "https://example.com/example.mp4");
        assert!(m.headers.is_empty());

        let toml = r#"
            url = "https://example.com/stream.m3u8"
            headers = { Referer = "https://example.com" }
        "#;
        let e = parse_webvideo(toml).unwrap();
        assert_eq!(
            e.headers.get("Referer").map(String::as_str),
            Some("https://example.com")
        );
    }

    #[test]
    fn rejects_non_http_url() {
        assert!(parse_webvideo("ftp://example.com/x").is_err());
        assert!(parse_ytvideo("").is_err());
    }

    #[test]
    fn torrent_hint() {
        assert_eq!(
            torrent_media_hint("movie.mp4.torrent").as_deref(),
            Some("mp4")
        );
        assert_eq!(
            torrent_media_hint("song.FLAC.torrent").as_deref(),
            Some("flac")
        );
        assert_eq!(torrent_media_hint("plain.torrent"), None);
        assert_eq!(torrent_media_hint("not-a-torrent.mp4"), None);
    }

    #[test]
    fn extended_toml_with_bad_url_is_error() {
        let toml = r#"url = "nope""#;
        assert!(parse_ytvideo(toml).is_err());
    }
}
