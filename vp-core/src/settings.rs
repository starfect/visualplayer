//! User settings model and language resolution (BLUEPRINT §6.2/§6.3).
//!
//! The struct is serde-friendly so the Tauri layer can persist it as JSON; this
//! crate owns the shape, defaults, clamping, and the language-selection order.

use serde::{Deserialize, Serialize};

use crate::i18n::{self, DEFAULT_LANGUAGE};

/// Theme preference; `System` follows the OS appearance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    /// Follow the operating system.
    #[default]
    System,
    /// Force light.
    Light,
    /// Force dark.
    Dark,
}

/// Persisted user settings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    /// Chosen UI language (`"en"`, `"ko"`, …). `None` means "auto-detect".
    pub language: Option<String>,
    /// Theme preference.
    pub theme: Theme,
    /// Preferred default resolution for network sources, e.g. `"1080p"`.
    pub default_resolution: Option<String>,
    /// Volume 0..=100.
    pub volume: u8,
    /// Playback speed multiplier.
    pub speed: f64,
    /// Upper bound on simultaneous playback instances (BLUEPRINT §9.2).
    pub max_simultaneous: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: None,
            theme: Theme::System,
            default_resolution: None,
            volume: 100,
            speed: 1.0,
            max_simultaneous: 4,
        }
    }
}

impl Settings {
    /// Return a copy with out-of-range fields clamped to safe values.
    pub fn sanitized(&self) -> Self {
        let mut s = self.clone();
        s.volume = s.volume.min(100);
        s.speed = s.speed.clamp(0.25, 4.0);
        s.max_simultaneous = s.max_simultaneous.clamp(1, 16);
        s
    }

    /// The effective UI language given this setting and the detected OS locale,
    /// following BLUEPRINT §6.3: user choice → OS locale → `en`.
    pub fn effective_language(&self, os_locale: Option<&str>) -> String {
        resolve_language(
            self.language.as_deref(),
            os_locale,
            i18n::SUPPORTED_LANGUAGES,
        )
    }
}

/// Pick the UI language: first a supported user choice, then a supported OS
/// locale (matched on its primary subtag), otherwise the default (`en`).
pub fn resolve_language(user: Option<&str>, os_locale: Option<&str>, supported: &[&str]) -> String {
    let pick = |tag: &str| -> Option<String> {
        let primary = i18n::primary_subtag(tag);
        supported
            .iter()
            .find(|s| **s == primary)
            .map(|s| (*s).to_string())
    };

    user.and_then(pick)
        .or_else(|| os_locale.and_then(pick))
        .unwrap_or_else(|| DEFAULT_LANGUAGE.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_sane() {
        let s = Settings::default();
        assert_eq!(s.language, None);
        assert_eq!(s.theme, Theme::System);
        assert_eq!(s.volume, 100);
        assert_eq!(s.effective_language(None), "en");
    }

    #[test]
    fn sanitize_clamps_ranges() {
        let s = Settings {
            volume: 250,
            speed: 99.0,
            max_simultaneous: 0,
            ..Default::default()
        }
        .sanitized();
        assert_eq!(s.volume, 100);
        assert_eq!(s.speed, 4.0);
        assert_eq!(s.max_simultaneous, 1);
    }

    #[test]
    fn language_resolution_order() {
        let sup = i18n::SUPPORTED_LANGUAGES;
        // user choice wins
        assert_eq!(resolve_language(Some("ko"), Some("en-US"), sup), "ko");
        // fall back to OS locale (primary subtag)
        assert_eq!(resolve_language(None, Some("ko-KR"), sup), "ko");
        // unsupported everywhere -> default en
        assert_eq!(resolve_language(Some("fr"), Some("de-DE"), sup), "en");
        assert_eq!(resolve_language(None, None, sup), "en");
    }

    #[test]
    fn round_trips_through_json() {
        let s = Settings {
            language: Some("ko".into()),
            theme: Theme::Dark,
            ..Default::default()
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(s, back);
    }

    #[test]
    fn deserializes_partial_json_with_defaults() {
        let back: Settings = serde_json::from_str(r#"{"language":"en"}"#).unwrap();
        assert_eq!(back.volume, 100);
        assert_eq!(back.theme, Theme::System);
    }
}
