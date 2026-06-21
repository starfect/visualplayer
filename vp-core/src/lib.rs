//! VisualPlayer core — pure, dependency-light logic shared by the Tauri backend.
//!
//! This crate intentionally has **no `tauri` or `libmpv` dependencies** so it can
//! be unit-tested in any environment (`cargo test -p vp-core`). It holds the
//! logic that does not need the playback engine: error types, playlist
//! management, custom-format parsing, same-name subtitle discovery, settings and
//! language resolution, and the catalogue of stable i18n message codes.
//!
//! See `BLUEPRINT.md` (single source of truth) and `CLAUDE.md`.

pub mod error;
pub mod formats;
pub mod i18n;
pub mod playlist;
pub mod settings;
pub mod subtitle;

pub use error::{Error, Result};
pub use playlist::{Playlist, PlaylistItem, RepeatMode};
pub use settings::{Settings, Theme};
