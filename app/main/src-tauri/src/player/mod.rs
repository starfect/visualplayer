//! Source resolution for playback (BLUEPRINT §7 `player_load`, §9.1, §9.3).
//!
//! `player_load` turns a user input (local path, http(s) URL, or a custom link
//! file) into a [`MediaSource`] the frontend hands to mpv via the libmpv plugin.
//! For local files it also auto-discovers same-name external subtitles.

use std::collections::BTreeMap;
use std::path::Path;

use serde::{Deserialize, Serialize};
use vp_core::error::{Error, Result};
use vp_core::{formats, subtitle};

/// How the resolved source should be interpreted by the player.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    /// A local media file on disk.
    LocalFile,
    /// A direct http(s)/HLS URL mpv can open directly.
    NetworkUrl,
    /// Resolved from a `.webvideo` link file.
    WebVideo,
}

/// A playable source plus metadata the frontend applies to mpv.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSource {
    /// What kind of source this is.
    pub kind: SourceKind,
    /// The path or URL mpv should `loadfile`.
    pub url: String,
    /// Optional display title (falls back to file name in the UI).
    pub title: Option<String>,
    /// External subtitle files to `sub-add` after loading.
    pub subtitles: Vec<String>,
    /// Optional HTTP headers (e.g. `Referer`) for network sources.
    pub headers: BTreeMap<String, String>,
}

/// Options for [`player_load`].
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct LoadOptions {
    /// Skip same-name subtitle auto-discovery for local files.
    pub no_subtitle_autoload: bool,
}

/// Resolve `path` into a [`MediaSource`]. `.ytvideo`/`.torrent` are routed to
/// their dedicated resolvers (later milestones) and rejected here.
#[tauri::command]
pub fn player_load(path: String, options: Option<LoadOptions>) -> Result<MediaSource> {
    resolve_source(&path, &options.unwrap_or_default())
}

fn resolve_source(input: &str, opts: &LoadOptions) -> Result<MediaSource> {
    if input.starts_with("http://") || input.starts_with("https://") {
        return Ok(MediaSource {
            kind: SourceKind::NetworkUrl,
            url: input.to_string(),
            title: None,
            subtitles: Vec::new(),
            headers: BTreeMap::new(),
        });
    }

    let path = Path::new(input);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "webvideo" => {
            let content = std::fs::read_to_string(path)?;
            let wv = formats::parse_webvideo(&content)?;
            Ok(MediaSource {
                kind: SourceKind::WebVideo,
                url: wv.url,
                title: wv.title,
                subtitles: Vec::new(),
                headers: wv.headers,
            })
        }
        "ytvideo" => Err(Error::NotImplemented(
            "ytvideo resolution requires yt-dlp — milestone M4",
        )),
        "torrent" => Err(Error::NotImplemented(
            "torrent streaming requires librqbit — milestone M4",
        )),
        _ => {
            if !path.exists() {
                return Err(Error::NotFound(input.to_string()));
            }
            let title = path
                .file_stem()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string());
            let subtitles = if opts.no_subtitle_autoload {
                Vec::new()
            } else {
                subtitle::discover_subtitles(path)
                    .unwrap_or_default()
                    .into_iter()
                    .filter_map(|p| p.to_str().map(str::to_string))
                    .collect()
            };
            Ok(MediaSource {
                kind: SourceKind::LocalFile,
                url: input.to_string(),
                title,
                subtitles,
                headers: BTreeMap::new(),
            })
        }
    }
}
