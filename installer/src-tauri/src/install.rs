//! Real install/uninstall logic: copy the payload, create OS shortcuts, register
//! file types and the Add/Remove entry (Windows), and record a manifest so the
//! uninstaller can cleanly reverse everything. No NSIS.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use vp_core::error::{Error, Result};

pub const APP_NAME: &str = "VisualPlayer";
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg(windows)]
pub const BIN_NAME: &str = "visualplayer.exe";
#[cfg(not(windows))]
pub const BIN_NAME: &str = "visualplayer";

const MANIFEST_FILE: &str = ".visualplayer-install.json";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallInfo {
    pub app_name: String,
    pub version: String,
    pub default_dir: String,
    pub already_installed: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallOptions {
    pub target_dir: String,
    pub desktop_shortcut: bool,
    pub start_menu: bool,
    pub register_file_types: bool,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub install_dir: String,
    pub shortcuts: Vec<String>,
    pub version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallReport {
    pub install_dir: String,
    pub files: usize,
    pub shortcuts: Vec<String>,
}

pub fn default_install_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        dirs::data_local_dir()
            .unwrap_or_default()
            .join("Programs")
            .join(APP_NAME)
    }
    #[cfg(target_os = "macos")]
    {
        PathBuf::from("/Applications").join(APP_NAME)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        dirs::data_local_dir().unwrap_or_default().join(APP_NAME)
    }
}

fn manifest_path(install_dir: &Path) -> PathBuf {
    install_dir.join(MANIFEST_FILE)
}

pub fn info() -> InstallInfo {
    let dir = default_install_dir();
    InstallInfo {
        app_name: APP_NAME.to_string(),
        version: APP_VERSION.to_string(),
        default_dir: dir.to_string_lossy().into_owned(),
        already_installed: manifest_path(&dir).exists(),
    }
}

fn copy_dir_all(src: &Path, dst: &Path, count: &mut usize) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let from = entry.path();
        if from.file_name().and_then(|n| n.to_str()) == Some(MANIFEST_FILE) {
            continue;
        }
        let to = dst.join(entry.file_name());
        if from.is_dir() {
            copy_dir_all(&from, &to, count)?;
        } else {
            fs::copy(&from, &to)?;
            *count += 1;
            #[cfg(unix)]
            make_executable_if_binary(&to);
        }
    }
    Ok(())
}

#[cfg(unix)]
fn make_executable_if_binary(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if path.file_name().and_then(|n| n.to_str()) == Some(BIN_NAME) {
        if let Ok(meta) = fs::metadata(path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(path, perms);
        }
    }
}

pub fn install(payload_dir: &Path, opts: &InstallOptions) -> Result<InstallReport> {
    if !payload_dir.exists() {
        return Err(Error::NotFound(format!(
            "installer payload not found: {}",
            payload_dir.display()
        )));
    }
    let target = PathBuf::from(&opts.target_dir);
    let mut files = 0usize;
    copy_dir_all(payload_dir, &target, &mut files)?;

    let exe = target.join(BIN_NAME);
    let mut shortcuts = Vec::new();
    if opts.desktop_shortcut || opts.start_menu {
        shortcuts = create_shortcuts(&exe, opts)?;
    }
    if opts.register_file_types {
        register_file_types(&exe);
    }

    let manifest = Manifest {
        install_dir: target.to_string_lossy().into_owned(),
        shortcuts: shortcuts.clone(),
        version: APP_VERSION.to_string(),
    };
    let json = serde_json::to_string_pretty(&manifest).map_err(|e| Error::Io(e.to_string()))?;
    fs::write(manifest_path(&target), json)?;

    Ok(InstallReport {
        install_dir: manifest.install_dir,
        files,
        shortcuts,
    })
}

pub fn uninstall() -> Result<()> {
    let dir = default_install_dir();
    let manifest: Manifest = fs::read_to_string(manifest_path(&dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| Manifest {
            install_dir: dir.to_string_lossy().into_owned(),
            ..Default::default()
        });

    for shortcut in &manifest.shortcuts {
        let _ = fs::remove_file(shortcut);
    }
    remove_registrations();

    let install_dir = PathBuf::from(&manifest.install_dir);
    if install_dir.exists() {
        fs::remove_dir_all(&install_dir)?;
    }
    Ok(())
}

// ---- Linux ----------------------------------------------------------------
#[cfg(target_os = "linux")]
fn desktop_entry(exe: &Path) -> String {
    format!(
        "[Desktop Entry]\nType=Application\nName={APP_NAME}\nExec=\"{}\" %F\nIcon=visualplayer\nCategories=AudioVideo;Player;\nMimeType=video/mp4;video/x-matroska;audio/mpeg;\nTerminal=false\n",
        exe.display()
    )
}

#[cfg(target_os = "linux")]
fn create_shortcuts(exe: &Path, opts: &InstallOptions) -> Result<Vec<String>> {
    let entry = desktop_entry(exe);
    let mut out = Vec::new();
    if opts.start_menu {
        if let Some(apps) = dirs::data_dir().map(|d| d.join("applications")) {
            fs::create_dir_all(&apps)?;
            let p = apps.join("visualplayer.desktop");
            fs::write(&p, &entry)?;
            out.push(p.to_string_lossy().into_owned());
        }
    }
    if opts.desktop_shortcut {
        if let Some(desk) = dirs::desktop_dir() {
            fs::create_dir_all(&desk)?;
            let p = desk.join("visualplayer.desktop");
            fs::write(&p, &entry)?;
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&p, fs::Permissions::from_mode(0o755));
            out.push(p.to_string_lossy().into_owned());
        }
    }
    Ok(out)
}

#[cfg(target_os = "linux")]
fn register_file_types(_exe: &Path) {
    if let Some(apps) = dirs::data_dir().map(|d| d.join("applications")) {
        let _ = std::process::Command::new("update-desktop-database")
            .arg(apps)
            .status();
    }
}

#[cfg(target_os = "linux")]
fn remove_registrations() {}

// ---- macOS ----------------------------------------------------------------
#[cfg(target_os = "macos")]
fn create_shortcuts(_exe: &Path, _opts: &InstallOptions) -> Result<Vec<String>> {
    Ok(Vec::new())
}

#[cfg(target_os = "macos")]
fn register_file_types(_exe: &Path) {}

#[cfg(target_os = "macos")]
fn remove_registrations() {}

// ---- Windows --------------------------------------------------------------
#[cfg(target_os = "windows")]
fn create_shortcuts(exe: &Path, opts: &InstallOptions) -> Result<Vec<String>> {
    use mslnk::ShellLink;
    let link = ShellLink::new(exe).map_err(|e| Error::Io(e.to_string()))?;
    let mut out = Vec::new();
    if opts.start_menu {
        if let Some(programs) = dirs::data_dir().map(|d| {
            d.join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs")
        }) {
            let _ = fs::create_dir_all(&programs);
            let p = programs.join(format!("{APP_NAME}.lnk"));
            link.create_lnk(&p).map_err(|e| Error::Io(e.to_string()))?;
            out.push(p.to_string_lossy().into_owned());
        }
    }
    if opts.desktop_shortcut {
        if let Some(desk) = dirs::desktop_dir() {
            let p = desk.join(format!("{APP_NAME}.lnk"));
            link.create_lnk(&p).map_err(|e| Error::Io(e.to_string()))?;
            out.push(p.to_string_lossy().into_owned());
        }
    }
    register_uninstall(exe);
    Ok(out)
}

#[cfg(target_os = "windows")]
fn register_uninstall(exe: &Path) {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let install_dir = exe
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = format!(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\{APP_NAME}");
    if let Ok((key, _)) = hkcu.create_subkey(path) {
        let _ = key.set_value("DisplayName", &APP_NAME.to_string());
        let _ = key.set_value("DisplayVersion", &APP_VERSION.to_string());
        let _ = key.set_value("Publisher", &"starfect".to_string());
        let _ = key.set_value("InstallLocation", &install_dir);
        let _ = key.set_value(
            "UninstallString",
            &format!("\"{install_dir}\\visualplayer-installer.exe\" --uninstall"),
        );
    }
}

#[cfg(target_os = "windows")]
fn register_file_types(_exe: &Path) {}

#[cfg(target_os = "windows")]
fn remove_registrations() {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = format!(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\{APP_NAME}");
    let _ = hkcu.delete_subkey_all(path);
}
