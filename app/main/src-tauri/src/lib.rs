//! VisualPlayer Tauri backend (the "shell").
//!
//! App-level logic lives in the pure [`vp_core`] crate; this crate adds the Tauri
//! glue: it registers plugins (notably `tauri-plugin-libmpv`), exposes IPC
//! commands, and holds shared state. **Low-level mpv transport** (play/pause/seek/
//! volume/speed/track) is driven from the frontend through the libmpv plugin's JS
//! API; the Rust commands here own the things mpv does not: source resolution,
//! same-name subtitle discovery, playlist, settings, file associations, licenses.
//! See `CLAUDE.md` "IPC realization" and `BLUEPRINT.md` §7.

mod assoc;
mod convert;
mod net;
mod player;
mod playlist;
mod settings;
mod subtitle;
mod system;
mod torrent;
mod whisper;

use std::sync::Mutex;

/// Shared, lock-guarded application state managed by Tauri.
#[derive(Default)]
pub struct AppState {
    /// Persisted user settings (theme, language, volume, …).
    pub settings: Mutex<vp_core::Settings>,
    /// The active playlist.
    pub playlist: Mutex<vp_core::Playlist>,
}

/// Build and run the Tauri application. Shared by the desktop binary and the
/// mobile entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_libmpv::init())
        .manage(AppState::default())
        .setup(|app| {
            // Load persisted settings into shared state at startup.
            use tauri::Manager;
            let loaded = settings::load_settings(app.handle());
            *app.state::<AppState>().settings.lock().unwrap() = loaded;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            player::player_load,
            playlist::playlist_get,
            playlist::playlist_add,
            playlist::playlist_remove,
            playlist::playlist_reorder,
            playlist::playlist_select,
            subtitle::subtitle_discover,
            settings::settings_get,
            settings::settings_set,
            settings::settings_set_language,
            assoc::assoc_initial_files,
            net::source_resolve_ytvideo,
            net::source_resolve_webvideo,
            whisper::whisper_generate,
            convert::convert_media,
            torrent::torrent_open,
            system::task_cancel,
            system::licenses_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VisualPlayer");
}
