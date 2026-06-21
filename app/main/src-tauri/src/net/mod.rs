//! Network source resolution.
//!
//! Parsing of `.ytvideo`/`.webvideo` link files is implemented now (via
//! [`vp_core::formats`]). Enumerating playable YouTube formats via the yt-dlp
//! sidecar is a later milestone (M4); for now these return the parsed link
//! descriptor, which is enough to route and (for `.webvideo`) play directly.

use vp_core::error::Result;
use vp_core::formats::{self, WebVideo, YtVideo};

/// Parse a `.ytvideo` file into its link descriptor.
#[tauri::command]
pub fn source_resolve_ytvideo(path: String) -> Result<YtVideo> {
    let content = std::fs::read_to_string(&path)?;
    formats::parse_ytvideo(&content)
}

/// Parse a `.webvideo` file into its (directly playable) link descriptor.
#[tauri::command]
pub fn source_resolve_webvideo(path: String) -> Result<WebVideo> {
    let content = std::fs::read_to_string(&path)?;
    formats::parse_webvideo(&content)
}
