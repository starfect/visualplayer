//! Subtitle IPC.
//!
//! Same-name discovery is app logic (delegated to [`vp_core::subtitle`]).
//! `subtitle_attach` and `subtitle_set_delay` are mpv operations performed on the
//! frontend via the libmpv plugin (`sub-add`, `sub-delay`), so they are not Rust
//! commands here — see `app/main/src/ipc/`.

use std::path::Path;

use vp_core::error::Result;

/// Discover same-name external subtitles next to `media_path`.
#[tauri::command]
pub fn subtitle_discover(media_path: String) -> Result<Vec<String>> {
    let paths = vp_core::subtitle::discover_subtitles(Path::new(&media_path))?;
    Ok(paths
        .into_iter()
        .filter_map(|p| p.to_str().map(str::to_string))
        .collect())
}
