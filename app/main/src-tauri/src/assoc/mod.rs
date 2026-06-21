//! File-association entry (BLUEPRINT §10.4).
//!
//! When the OS launches the app to open a file, the path arrives as a process
//! argument. The frontend calls [`assoc_initial_files`] on startup and routes
//! each path through `player_load` / the resolvers. Contents are treated strictly
//! as data (BLUEPRINT §17) — never executed.

use vp_core::error::Result;

/// Paths passed to the process (skipping flags), e.g. a double-clicked media or
/// `.webvideo`/`.ytvideo`/`.torrent` file.
pub fn collect_open_paths() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .collect()
}

/// Files the app was asked to open at launch.
#[tauri::command]
pub fn assoc_initial_files() -> Result<Vec<String>> {
    Ok(collect_open_paths())
}
