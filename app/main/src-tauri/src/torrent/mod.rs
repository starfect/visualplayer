//! Torrent download (download-only) with same-name video/subtitle pairing.
//!
//! `torrent_plan` works everywhere (pure pairing via `vp_core::torrent`).
//! `torrent_open` performs the actual download via librqbit and is compiled only
//! with the `torrent` cargo feature; release builds enable it.

use std::path::Path;

use serde::Serialize;
use tauri::AppHandle;
use vp_core::error::{Error, Result};
use vp_core::torrent::{self, TorrentPlan};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TorrentResolution {
    pub plan: TorrentPlan,
    pub video_path: Option<String>,
    pub subtitle_paths: Vec<String>,
    pub output_dir: String,
}

fn build_plan(video_torrent_path: &str) -> Result<TorrentPlan> {
    let path = Path::new(video_torrent_path);
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or(Error::InvalidPath)?;
    if !torrent::is_video_torrent(file_name) {
        return Err(Error::UnsupportedFormat(format!(
            "not a video .torrent: {file_name}"
        )));
    }
    let subtitle_torrents = torrent::discover_subtitle_torrents(path)
        .unwrap_or_default()
        .into_iter()
        .filter_map(|p| p.to_str().map(str::to_string))
        .collect();
    Ok(TorrentPlan {
        video_torrent: video_torrent_path.to_string(),
        subtitle_torrents,
    })
}

/// Report the video torrent plus the same-name subtitle torrents that would be
/// fetched. Always available (no download performed).
#[tauri::command]
pub fn torrent_plan(path: String) -> Result<TorrentPlan> {
    build_plan(&path)
}

#[tauri::command]
pub async fn torrent_open(app: AppHandle, path: String) -> Result<TorrentResolution> {
    #[cfg(feature = "torrent")]
    {
        download::run(app, build_plan(&path)?).await
    }
    #[cfg(not(feature = "torrent"))]
    {
        let _ = (&app, build_plan(&path)?);
        Err(Error::NotImplemented(
            "torrent download requires a build with the `torrent` feature",
        ))
    }
}

#[cfg(feature = "torrent")]
mod download {
    use super::*;
    use librqbit::{AddTorrent, AddTorrentOptions, Session};
    use vp_core::media::{self, MediaKind};

    fn io(e: impl std::fmt::Display) -> Error {
        Error::Io(e.to_string())
    }

    pub async fn run(app: AppHandle, plan: TorrentPlan) -> Result<TorrentResolution> {
        use tauri::Manager;
        let output_dir = app.path().app_cache_dir().map_err(io)?.join("torrents");
        std::fs::create_dir_all(&output_dir)?;

        let session = Session::new(output_dir.clone()).await.map_err(io)?;

        // Subtitles are tiny: fetch them to completion first so they are ready.
        for sub in &plan.subtitle_torrents {
            let added = session
                .add_torrent(AddTorrent::from_local_filename(sub).map_err(io)?, opts())
                .await
                .map_err(io)?;
            if let Some(handle) = added.into_handle() {
                handle.wait_until_completed().await.map_err(io)?;
            }
        }

        let added = session
            .add_torrent(
                AddTorrent::from_local_filename(&plan.video_torrent).map_err(io)?,
                opts(),
            )
            .await
            .map_err(io)?;
        if let Some(handle) = added.into_handle() {
            handle.wait_until_completed().await.map_err(io)?;
        }

        let (video_path, subtitle_paths) = scan_outputs(&output_dir);
        Ok(TorrentResolution {
            plan,
            video_path,
            subtitle_paths,
            output_dir: output_dir.to_string_lossy().into_owned(),
        })
    }

    fn opts() -> Option<AddTorrentOptions> {
        Some(AddTorrentOptions {
            overwrite: true,
            ..Default::default()
        })
    }

    fn scan_outputs(dir: &Path) -> (Option<String>, Vec<String>) {
        let mut largest_video: Option<(u64, String)> = None;
        let mut subtitles = Vec::new();
        let mut stack = vec![dir.to_path_buf()];
        while let Some(current) = stack.pop() {
            let Ok(entries) = std::fs::read_dir(&current) else {
                continue;
            };
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                    continue;
                }
                let Some(name) = path.to_str().map(str::to_string) else {
                    continue;
                };
                match media::kind_from_path(&path) {
                    MediaKind::Video => {
                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        if largest_video.as_ref().is_none_or(|(s, _)| size > *s) {
                            largest_video = Some((size, name));
                        }
                    }
                    MediaKind::Subtitle => subtitles.push(name),
                    _ => {}
                }
            }
        }
        (largest_video.map(|(_, n)| n), subtitles)
    }
}
