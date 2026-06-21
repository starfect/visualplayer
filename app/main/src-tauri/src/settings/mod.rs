//! Settings persistence and language commands.
//!
//! Settings are stored as JSON in the platform app-config directory. The shape,
//! defaults, clamping, and language resolution live in [`vp_core::settings`].

use std::path::PathBuf;

use tauri::{AppHandle, Manager, State};
use vp_core::error::{Error, Result};
use vp_core::shortcuts::{self, Binding};
use vp_core::Settings;

use crate::AppState;

fn settings_path(app: &AppHandle) -> Result<PathBuf> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| Error::Io(e.to_string()))?;
    Ok(dir.join("settings.json"))
}

/// Load settings from disk, falling back to defaults (sanitized).
pub fn load_settings(app: &AppHandle) -> Settings {
    settings_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<Settings>(&s).ok())
        .unwrap_or_default()
        .sanitized()
}

fn persist(app: &AppHandle, settings: &Settings) -> Result<()> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| Error::Io(e.to_string()))?;
    std::fs::write(path, json)?;
    Ok(())
}

/// Return current settings.
#[tauri::command]
pub fn settings_get(state: State<AppState>) -> Result<Settings> {
    Ok(state.settings.lock().unwrap().clone())
}

/// Replace settings (sanitized) and persist; returns the stored value.
#[tauri::command]
pub fn settings_set(
    app: AppHandle,
    state: State<AppState>,
    settings: Settings,
) -> Result<Settings> {
    let sane = settings.sanitized();
    *state.settings.lock().unwrap() = sane.clone();
    persist(&app, &sane)?;
    Ok(sane)
}

/// Change only the UI language; persists and returns it.
#[tauri::command]
pub fn settings_set_language(
    app: AppHandle,
    state: State<AppState>,
    lang: String,
) -> Result<Settings> {
    let sane = {
        let mut guard = state.settings.lock().unwrap();
        guard.language = Some(vp_core::i18n::primary_subtag(&lang));
        let sane = guard.sanitized();
        *guard = sane.clone();
        sane
    };
    persist(&app, &sane)?;
    Ok(sane)
}

/// The built-in default keyboard shortcut set (used by the frontend to seed its
/// keymap when the user has no custom bindings).
#[tauri::command]
pub fn settings_default_keybindings() -> Result<Vec<Binding>> {
    Ok(shortcuts::default_bindings())
}
