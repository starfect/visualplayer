//! VisualPlayer Tauri backend.
//!
//! Pure logic lives in `vp_core`; this crate adds the Tauri glue: it registers
//! plugins (notably `tauri-plugin-libmpv`), exposes IPC commands, and holds
//! shared state. Low-level mpv transport is driven from the frontend through the
//! libmpv plugin; the Rust commands here own source resolution, subtitle
//! discovery, playlist, settings, history, torrent pairing, and file associations.

mod assoc;
mod convert;
mod history;
mod net;
mod player;
mod playlist;
mod settings;
mod sidecar;
mod subtitle;
mod system;
mod tasks;
mod torrent;
mod whisper;

use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

#[derive(Default)]
pub struct AppState {
    pub settings: Mutex<vp_core::Settings>,
    pub playlist: Mutex<vp_core::Playlist>,
    pub history: Mutex<vp_core::History>,
    pub tasks: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

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
            use tauri::Manager;
            let handle = app.handle();
            let state = app.state::<AppState>();
            *state.settings.lock().unwrap() = settings::load_settings(handle);
            *state.history.lock().unwrap() = history::load(handle);
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
            settings::settings_default_keybindings,
            history::history_get,
            history::history_record,
            history::history_resume_position,
            history::history_remove,
            history::history_clear,
            assoc::assoc_initial_files,
            assoc::assoc_register_default_handler,
            net::source_resolve_ytvideo,
            net::source_resolve_webvideo,
            torrent::torrent_plan,
            torrent::torrent_open,
            whisper::whisper_generate,
            whisper::whisper_download_model,
            convert::convert_media,
            system::task_cancel,
            system::licenses_list,
            system::app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VisualPlayer");
}
