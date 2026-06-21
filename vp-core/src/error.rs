//! Typed, recoverable error model for VisualPlayer.
//!
//! Per BLUEPRINT §6.3/§7/§20, the backend returns **stable message codes** rather
//! than human strings; the frontend i18n layer maps a `code` to a localized
//! message. Every variant therefore exposes a `code()` and serializes to
//! `{ "code": "...", "message": "..." }` for the WebView.

use serde::{ser::SerializeStruct, Serialize, Serializer};

/// Convenient crate-wide result type.
pub type Result<T> = std::result::Result<T, Error>;

/// All recoverable errors surfaced across the core and IPC boundary.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// A feature exists in the API surface but is not implemented yet
    /// (later-milestone stubs: whisper/convert/torrent/net).
    #[error("not implemented: {0}")]
    NotImplemented(&'static str),

    /// A referenced file/path does not exist.
    #[error("not found: {0}")]
    NotFound(String),

    /// A path was empty or otherwise unusable.
    #[error("invalid path")]
    InvalidPath,

    /// The container/extension/codec is not something we handle.
    #[error("unsupported format: {0}")]
    UnsupportedFormat(String),

    /// Failed to parse a custom format file (`.ytvideo` / `.webvideo`) or config.
    #[error("parse error: {0}")]
    Parse(String),

    /// A caller passed an invalid argument (out of range, etc.).
    #[error("invalid argument: {0}")]
    InvalidArgument(String),

    /// An underlying I/O failure.
    #[error("io error: {0}")]
    Io(String),
}

impl Error {
    /// Stable machine-readable code the frontend maps to an i18n string.
    ///
    /// These codes are part of the public contract — keep them in sync with
    /// [`crate::i18n::ERROR_CODES`] and the frontend locale files.
    pub fn code(&self) -> &'static str {
        match self {
            Error::NotImplemented(_) => "error.not_implemented",
            Error::NotFound(_) => "error.not_found",
            Error::InvalidPath => "error.invalid_path",
            Error::UnsupportedFormat(_) => "error.unsupported_format",
            Error::Parse(_) => "error.parse",
            Error::InvalidArgument(_) => "error.invalid_argument",
            Error::Io(_) => "error.io",
        }
    }
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("Error", 2)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        match e.kind() {
            std::io::ErrorKind::NotFound => Error::NotFound(e.to_string()),
            _ => Error::Io(e.to_string()),
        }
    }
}

impl From<toml::de::Error> for Error {
    fn from(e: toml::de::Error) -> Self {
        Error::Parse(e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_are_dotted_and_stable() {
        for e in [
            Error::NotImplemented("x"),
            Error::NotFound("x".into()),
            Error::InvalidPath,
            Error::UnsupportedFormat("x".into()),
            Error::Parse("x".into()),
            Error::InvalidArgument("x".into()),
            Error::Io("x".into()),
        ] {
            let code = e.code();
            assert!(code.starts_with("error."), "unexpected code: {code}");
        }
    }

    #[test]
    fn serializes_code_and_message() {
        let json = serde_json::to_value(Error::NotImplemented("whisper")).unwrap();
        assert_eq!(json["code"], "error.not_implemented");
        assert!(json["message"].as_str().unwrap().contains("whisper"));
    }

    #[test]
    fn io_not_found_maps_to_not_found() {
        let io = std::io::Error::new(std::io::ErrorKind::NotFound, "nope");
        assert_eq!(Error::from(io).code(), "error.not_found");
    }
}
