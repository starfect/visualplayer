//! File-association entry and OS default-handler registration.
//!
//! Opened paths arrive as process arguments; the frontend reads them at startup
//! and routes each one. Contents are treated strictly as data, never executed.

use vp_core::error::{Error, Result};

pub fn collect_open_paths() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .collect()
}

#[tauri::command]
pub fn assoc_initial_files() -> Result<Vec<String>> {
    Ok(collect_open_paths())
}

#[allow(dead_code)]
const APP_DESKTOP_ID: &str = "dev.starfect.visualplayer.desktop";

#[allow(dead_code)]
const MEDIA_MIME_TYPES: &[&str] = &[
    "video/mp4",
    "video/x-matroska",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/mpeg",
    "video/x-ms-wmv",
    "video/x-flv",
    "video/3gpp",
    "video/mp2t",
    "audio/mpeg",
    "audio/aac",
    "audio/flac",
    "audio/ogg",
    "audio/opus",
    "audio/wav",
    "audio/x-m4a",
    "audio/x-ms-wma",
    "application/x-subrip",
    "text/vtt",
    "text/x-ssa",
];

/// Make VisualPlayer the default handler for every supported media/subtitle type.
/// Best-effort and OS-specific; returns a status message code for the UI.
#[tauri::command]
pub fn assoc_register_default_handler(_app: tauri::AppHandle) -> Result<String> {
    #[cfg(target_os = "linux")]
    {
        let mut args = vec!["default".to_string(), APP_DESKTOP_ID.to_string()];
        args.extend(MEDIA_MIME_TYPES.iter().map(|m| m.to_string()));
        let status = std::process::Command::new("xdg-mime")
            .args(&args)
            .status()
            .map_err(|e| Error::Io(e.to_string()))?;
        return if status.success() {
            Ok("assoc.registered".to_string())
        } else {
            Err(Error::Io("xdg-mime failed".to_string()))
        };
    }

    #[cfg(target_os = "macos")]
    {
        // `duti` registers default handlers when present; otherwise the user is
        // directed to System Settings. Both are surfaced to the UI as codes.
        if which("duti") {
            for mime in MEDIA_MIME_TYPES {
                let _ = std::process::Command::new("duti")
                    .args(["-s", "dev.starfect.visualplayer", mime, "all"])
                    .status();
            }
            return Ok("assoc.registered".to_string());
        }
        return Ok("assoc.open_settings".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        // Per-extension defaults require the Windows "Default apps" UI on Win10+.
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "ms-settings:defaultapps"])
            .status();
        return Ok("assoc.open_settings".to_string());
    }

    #[allow(unreachable_code)]
    Err(Error::NotImplemented(
        "default-handler registration on this platform",
    ))
}

#[cfg(target_os = "macos")]
fn which(bin: &str) -> bool {
    std::process::Command::new("which")
        .arg(bin)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
