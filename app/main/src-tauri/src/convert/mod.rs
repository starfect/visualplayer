//! Container/codec conversion via FFmpeg (BLUEPRINT §9.5) — milestone **M3**.
//!
//! Will call the bundled GPL full-build FFmpeg (sidecar) to transcode; the
//! distributed binary therefore follows GPLv3 (BLUEPRINT §18). Stub for now.

use vp_core::error::{Error, Result};

/// Start a conversion job (returns a task id when implemented).
#[tauri::command]
pub fn convert_media(
    _input: String,
    _target_ext: String,
    _opts: Option<serde_json::Value>,
) -> Result<String> {
    Err(Error::NotImplemented(
        "media conversion (FFmpeg) — milestone M3",
    ))
}
