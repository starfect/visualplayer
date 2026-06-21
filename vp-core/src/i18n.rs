//! Canonical catalogue of **stable message codes** shared with the frontend.
//!
//! The backend never returns localized prose (BLUEPRINT §6.3): it returns a code
//! from this catalogue, and the frontend i18n layer renders the text. Keeping the
//! list here lets tests assert that every code the backend can emit has a known,
//! dotted identifier (and, by convention, a matching key in `en.json`).

/// Default UI language (BLUEPRINT §6.3). Never change away from `en`.
pub const DEFAULT_LANGUAGE: &str = "en";

/// Languages with bundled locale files in this build.
pub const SUPPORTED_LANGUAGES: &[&str] = &["en", "ko"];

/// Error codes emitted by [`crate::error::Error::code`].
pub const ERROR_CODES: &[&str] = &[
    "error.not_implemented",
    "error.not_found",
    "error.invalid_path",
    "error.unsupported_format",
    "error.parse",
    "error.invalid_argument",
    "error.io",
];

/// Task/event status codes pushed over `task://*` events (BLUEPRINT §7).
pub const TASK_CODES: &[&str] = &[
    "task.queued",
    "task.running",
    "task.progress",
    "task.done",
    "task.cancelled",
    "task.error",
];

/// `true` if `code` is a known dotted message code (`domain.identifier`).
pub fn is_known_code(code: &str) -> bool {
    ERROR_CODES.contains(&code) || TASK_CODES.contains(&code)
}

/// `true` if `lang` (e.g. `"ko"` or `"ko-KR"`) is a supported UI language.
pub fn is_supported_language(lang: &str) -> bool {
    let primary = primary_subtag(lang);
    SUPPORTED_LANGUAGES.iter().any(|l| *l == primary)
}

/// Normalize a BCP-47-ish tag to its lowercase primary subtag: `ko-KR` -> `ko`.
pub fn primary_subtag(lang: &str) -> String {
    lang.split(['-', '_'])
        .next()
        .unwrap_or(lang)
        .trim()
        .to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_code_is_dotted() {
        for code in ERROR_CODES.iter().chain(TASK_CODES.iter()) {
            assert!(code.contains('.'), "code missing domain: {code}");
            assert!(is_known_code(code));
        }
    }

    #[test]
    fn error_codes_match_error_variants() {
        use crate::error::Error;
        let samples = [
            Error::NotImplemented("x"),
            Error::NotFound("x".into()),
            Error::InvalidPath,
            Error::UnsupportedFormat("x".into()),
            Error::Parse("x".into()),
            Error::InvalidArgument("x".into()),
            Error::Io("x".into()),
        ];
        for e in samples {
            assert!(
                ERROR_CODES.contains(&e.code()),
                "missing code: {}",
                e.code()
            );
        }
    }

    #[test]
    fn language_normalization() {
        assert_eq!(primary_subtag("ko-KR"), "ko");
        assert_eq!(primary_subtag("EN_us"), "en");
        assert!(is_supported_language("ko"));
        assert!(is_supported_language("en-GB"));
        assert!(!is_supported_language("fr"));
    }
}
