//! Torrent streaming via librqbit (BLUEPRINT §10.1) — milestone **M4**.
//!
//! Download-only: upload/seeding stays disabled (librqbit feature flag), protocol
//! encryption (MSE/PE) on. Streams while downloading (piece priority). Stub for now.

use vp_core::error::{Error, Result};

/// Open a `.torrent` and start a download-only streaming session.
#[tauri::command]
pub fn torrent_open(_path: String) -> Result<String> {
    Err(Error::NotImplemented(
        "torrent streaming (librqbit, download-only) — milestone M4",
    ))
}
