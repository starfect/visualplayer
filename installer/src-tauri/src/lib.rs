//! VisualPlayer installer/uninstaller (Tauri). A real installer: it copies the
//! bundled payload, creates shortcuts, registers file types, writes an uninstall
//! manifest, and supports a `--uninstall` CLI mode.

mod install;

use std::path::PathBuf;

use vp_core::error::{Error, Result};

use install::{InstallInfo, InstallOptions, InstallReport};

#[tauri::command]
fn installer_info() -> Result<InstallInfo> {
    Ok(install::info())
}

#[tauri::command]
fn installer_install(options: InstallOptions) -> Result<InstallReport> {
    install::install(&options)
}

#[tauri::command]
fn installer_uninstall() -> Result<()> {
    install::uninstall()
}

#[tauri::command]
fn installer_launch(install_dir: String) -> Result<()> {
    let exe = PathBuf::from(install_dir).join(install::BIN_NAME);
    std::process::Command::new(exe)
        .spawn()
        .map_err(|e| Error::Io(e.to_string()))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Headless uninstall entry point: `visualplayer-installer --uninstall`.
    if std::env::args().any(|a| a == "--uninstall") {
        let _ = install::uninstall();
        return;
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            installer_info,
            installer_install,
            installer_uninstall,
            installer_launch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the installer");
}
