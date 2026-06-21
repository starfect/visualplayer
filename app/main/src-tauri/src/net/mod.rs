//! Network source resolution: parse `.ytvideo`/`.webvideo` link files and, for
//! YouTube, resolve a directly playable stream URL via yt-dlp (sidecar or PATH).

use std::process::Command;

use tauri::AppHandle;
use vp_core::error::Result;
use vp_core::formats::{self, WebVideo, YtVideo};

use crate::sidecar;

/// Parse a `.ytvideo` file and try to resolve a direct stream URL with yt-dlp.
/// Falls back to the original page URL (which mpv can open via its ytdl hook).
#[tauri::command]
pub fn source_resolve_ytvideo(app: AppHandle, path: String) -> Result<YtVideo> {
    let content = std::fs::read_to_string(&path)?;
    let mut yt = formats::parse_ytvideo(&content)?;

    let ytdlp = sidecar::resolve(&app, "yt-dlp");
    let mut args = vec!["-g".to_string(), "--no-warnings".to_string()];
    if let Some(res) = &yt.preferred_resolution {
        let height = res.trim_end_matches('p');
        args.push("-f".to_string());
        args.push(format!(
            "bestvideo[height<={height}]+bestaudio/best[height<={height}]/best"
        ));
    }
    args.push(yt.url.clone());

    if let Ok(output) = Command::new(&ytdlp).args(&args).output() {
        if output.status.success() {
            let urls: Vec<String> = String::from_utf8_lossy(&output.stdout)
                .lines()
                .filter(|l| l.starts_with("http"))
                .map(str::to_string)
                .collect();
            // A single muxed URL is directly playable; multiple separate
            // video/audio URLs are left to mpv's ytdl hook via the page URL.
            if urls.len() == 1 {
                yt.url = urls.into_iter().next().unwrap();
            }
        }
    }
    Ok(yt)
}

/// Parse a `.webvideo` file into its (directly playable) link descriptor.
#[tauri::command]
pub fn source_resolve_webvideo(path: String) -> Result<WebVideo> {
    let content = std::fs::read_to_string(&path)?;
    formats::parse_webvideo(&content)
}
