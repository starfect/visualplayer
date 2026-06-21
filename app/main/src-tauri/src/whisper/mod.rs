//! Local automatic subtitles via Whisper (BLUEPRINT §9.4) — milestone **M3**.
//!
//! Planned flow: media → FFmpeg 16 kHz mono PCM → VAD segments → `whisper-rs`
//! inference → timestamped `.srt`. Runs fully locally (no upload). Stub for now.

use vp_core::error::{Error, Result};

/// Start an automatic-subtitle job (returns a task id when implemented).
#[tauri::command]
pub fn whisper_generate(
    _media_path: String,
    _model: Option<String>,
    _lang: Option<String>,
) -> Result<String> {
    Err(Error::NotImplemented(
        "automatic subtitles (whisper-rs) — milestone M3",
    ))
}
