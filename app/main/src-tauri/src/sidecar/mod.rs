//! Locate a bundled sidecar binary (ffmpeg, yt-dlp), falling back to PATH.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub fn resolve(app: &AppHandle, name: &str) -> PathBuf {
    let exe = if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    };
    if let Ok(resource_dir) = app.path().resource_dir() {
        for candidate in [
            resource_dir.join("binaries").join(&exe),
            resource_dir.join(&exe),
        ] {
            if candidate.exists() {
                return candidate;
            }
        }
    }
    PathBuf::from(name)
}
