//! System/utility IPC: background-task control and third-party license listing
//! (BLUEPRINT §7, §18.2).

use serde::Serialize;
use tauri::{AppHandle, Manager};
use vp_core::error::{Error, Result};

/// One third-party license entry shown in the in-app "Licenses" screen.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseEntry {
    /// File name (e.g. `FFmpeg-LICENSE.txt`).
    pub name: String,
    /// Full license text.
    pub text: String,
}

/// Cancel a running background task (download/convert/whisper) — milestone M3.
#[tauri::command]
pub fn task_cancel(_task_id: String) -> Result<()> {
    Err(Error::NotImplemented(
        "task cancellation — wired with the first background task (M3)",
    ))
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
