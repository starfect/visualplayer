//! Playlist IPC commands (BLUEPRINT §7, §9.2). All mutations go through the
//! shared [`crate::AppState`] playlist and return the updated snapshot so the
//! frontend store can replace its state in one step.

use tauri::State;
use vp_core::error::Result;
use vp_core::Playlist;

use crate::AppState;

/// Return the current playlist.
#[tauri::command]
pub fn playlist_get(state: State<AppState>) -> Result<Playlist> {
    Ok(state.playlist.lock().unwrap().clone())
}

/// Append an item; returns the updated playlist.
#[tauri::command]
pub fn playlist_add(
    state: State<AppState>,
    path: String,
    title: Option<String>,
) -> Result<Playlist> {
    let mut pl = state.playlist.lock().unwrap();
    pl.add(path, title);
    Ok(pl.clone())
}

/// Remove the item with `id`; returns the updated playlist.
#[tauri::command]
pub fn playlist_remove(state: State<AppState>, id: u64) -> Result<Playlist> {
    let mut pl = state.playlist.lock().unwrap();
    pl.remove(id);
    Ok(pl.clone())
}

/// Move an item from one position to another; returns the updated playlist.
#[tauri::command]
pub fn playlist_reorder(state: State<AppState>, from: usize, to: usize) -> Result<Playlist> {
    let mut pl = state.playlist.lock().unwrap();
    pl.reorder(from, to)?;
    Ok(pl.clone())
}

/// Select the item with `id` as current; returns the updated playlist.
#[tauri::command]
pub fn playlist_select(state: State<AppState>, id: u64) -> Result<Playlist> {
    let mut pl = state.playlist.lock().unwrap();
    pl.select(id)?;
    Ok(pl.clone())
}
