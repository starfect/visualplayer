//! VisualPlayer core: pure, dependency-light logic shared by the Tauri backend.
//!
//! No `tauri`/`libmpv` dependencies, so everything here is unit-testable in any
//! environment (`cargo test -p vp-core`).

pub mod error;
pub mod formats;
pub mod history;
pub mod i18n;
pub mod m3u;
pub mod media;
pub mod playlist;
pub mod settings;
pub mod shortcuts;
pub mod subtitle;
pub mod torrent;

pub use error::{Error, Result};
pub use history::{History, HistoryEntry};
pub use m3u::M3uEntry;
pub use media::MediaKind;
pub use playlist::{Playlist, PlaylistItem, RepeatMode};
pub use settings::{Settings, Theme};
pub use shortcuts::{Action, Binding, KeyChord};
pub use torrent::TorrentPlan;
