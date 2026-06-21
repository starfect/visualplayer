//! Persisted playback history (recent files + resume positions).

use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager, State};
use vp_core::error::{Error, Result};
use vp_core::history::History;

use crate::AppState;

fn history_path(app: &AppHandle) -> Result<PathBuf> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| Error::Io(e.to_string()))?;
    Ok(dir.join("history.json"))
}

pub fn load(app: &AppHandle) -> History {
    history_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<History>(&s).ok())
        .unwrap_or_default()
}

fn persist(app: &AppHandle, history: &History) -> Result<()> {
    let path = history_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(history).map_err(|e| Error::Io(e.to_string()))?;
    std::fs::write(path, json)?;
    Ok(())
}

fn now_epoch() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[tauri::command]
pub fn history_get(state: State<AppState>) -> Result<History> {
    Ok(state.history.lock().unwrap().clone())
}

#[tauri::command]
pub fn history_record(
    app: AppHandle,
    state: State<AppState>,
    path: String,
    title: Option<String>,
    position: f64,
    duration: f64,
) -> Result<()> {
    let snapshot = {
        let mut h = state.history.lock().unwrap();
        h.record(path, title, position, duration, now_epoch());
        h.clone()
    };
    persist(&app, &snapshot)
}

#[tauri::command]
pub fn history_resume_position(state: State<AppState>, path: String) -> Result<Option<f64>> {
    Ok(state.history.lock().unwrap().resume_position(&path))
}

#[tauri::command]
pub fn history_remove(app: AppHandle, state: State<AppState>, path: String) -> Result<History> {
    let snapshot = {
        let mut h = state.history.lock().unwrap();
        h.remove(&path);
        h.clone()
    };
    persist(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
pub fn history_clear(app: AppHandle, state: State<AppState>) -> Result<()> {
    let snapshot = {
        let mut h = state.history.lock().unwrap();
        h.clear();
        h.clone()
    };
    persist(&app, &snapshot)
}
