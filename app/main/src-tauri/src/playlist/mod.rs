//! Playlist IPC commands. All mutations go through the
//! shared [`crate::AppState`] playlist and return the updated snapshot so the
//! frontend store can replace its state in one step.

use std::path::{Path, PathBuf};

use tauri::State;
use vp_core::error::{Error, Result};
use vp_core::{m3u, M3uEntry, Playlist};

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

/// Write the current playlist to `path` as an extended-M3U file.
#[tauri::command]
pub fn playlist_export_m3u(state: State<AppState>, path: String) -> Result<String> {
    let pl = state.playlist.lock().unwrap();
    let entries: Vec<M3uEntry> = pl
        .items
        .iter()
        .map(|item| M3uEntry::new(item.path.clone(), item.title.clone(), -1))
        .collect();
    std::fs::write(&path, m3u::serialize(&entries))?;
    Ok(path)
}

/// Load an M3U/M3U8 file, appending its entries to the playlist. Relative paths
/// are resolved against the playlist file's own directory; URLs are kept as-is.
#[tauri::command]
pub fn playlist_import_m3u(state: State<AppState>, path: String) -> Result<Playlist> {
    let file = PathBuf::from(&path);
    let base = file.parent().unwrap_or_else(|| Path::new(""));
    let content = std::fs::read_to_string(&file)?;
    let entries = m3u::parse(&content);
    if entries.is_empty() {
        return Err(Error::Parse("empty playlist".into()));
    }
    let mut pl = state.playlist.lock().unwrap();
    for entry in entries {
        pl.add(resolve_entry(base, &entry.path), entry.title);
    }
    Ok(pl.clone())
}

fn resolve_entry(base: &Path, raw: &str) -> String {
    if is_url(raw) {
        return raw.to_string();
    }
    let p = Path::new(raw);
    if p.is_absolute() {
        raw.to_string()
    } else {
        base.join(p).to_string_lossy().into_owned()
    }
}

fn is_url(value: &str) -> bool {
    value.contains("://")
}
