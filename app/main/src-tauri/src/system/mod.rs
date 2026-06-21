//! System/utility IPC: background-task control and third-party license listing
//!.

use std::sync::atomic::Ordering;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use vp_core::error::{Error, Result};

use crate::AppState;

/// One third-party license entry shown in the in-app "Licenses" screen.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseEntry {
    /// File name (e.g. `FFmpeg-LICENSE.txt`).
    pub name: String,
    /// Full license text.
    pub text: String,
}

/// Signal a running background task (convert/…) to stop.
#[tauri::command]
pub fn task_cancel(state: State<AppState>, task_id: String) -> Result<()> {
    match state.tasks.lock().unwrap().get(&task_id) {
        Some(flag) => {
            flag.store(true, Ordering::Relaxed);
            Ok(())
        }
        None => Err(Error::NotFound(task_id)),
    }
}

/// List bundled third-party licenses from the app resource directory (§18.2).
#[tauri::command]
pub fn licenses_list(app: AppHandle) -> Result<Vec<LicenseEntry>> {
    let dir = app
        .path()
        .resource_dir()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("licenses");

    let mut entries = Vec::new();
    if let Ok(read_dir) = std::fs::read_dir(&dir) {
        for entry in read_dir.flatten() {
            if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
                let name = entry.file_name().to_string_lossy().into_owned();
                let text = std::fs::read_to_string(entry.path()).unwrap_or_default();
                entries.push(LicenseEntry { name, text });
            }
        }
    }
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

/// Basic application/runtime info for the about screen.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub os: String,
    pub arch: String,
}

#[tauri::command]
pub fn app_info() -> Result<AppInfo> {
    Ok(AppInfo {
        name: "VisualPlayer".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}
