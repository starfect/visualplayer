//! Persisted user settings and language resolution.

use serde::{Deserialize, Serialize};

use crate::i18n::{self, DEFAULT_LANGUAGE};
use crate::shortcuts::Binding;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct PlaybackSettings {
    pub remember_position: bool,
    pub hardware_decoding: bool,
    pub seek_step_seconds: f64,
    pub seek_step_long_seconds: f64,
    pub volume_step: u8,
    pub max_volume: u16,
    pub autoplay_next: bool,
    pub pause_on_minimize: bool,
}

impl Default for PlaybackSettings {
    fn default() -> Self {
        Self {
            remember_position: true,
            hardware_decoding: true,
            seek_step_seconds: 5.0,
            seek_step_long_seconds: 60.0,
            volume_step: 5,
            max_volume: 130,
            autoplay_next: true,
            pause_on_minimize: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct SubtitleSettings {
    pub autoload: bool,
    pub font_size: u32,
    pub color: String,
    pub border_size: f64,
    pub position: u8,
    pub default_delay: f64,
    pub bold: bool,
}

impl Default for SubtitleSettings {
    fn default() -> Self {
        Self {
            autoload: true,
            font_size: 48,
            color: "#FFFFFF".to_string(),
            border_size: 2.0,
            position: 100,
            default_delay: 0.0,
            bold: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct GestureSettings {
    pub enabled: bool,
    pub seek_enabled: bool,
    pub volume_enabled: bool,
    pub brightness_enabled: bool,
    pub double_tap_seek: bool,
    pub seek_sensitivity: f64,
}

impl Default for GestureSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            seek_enabled: true,
            volume_enabled: true,
            brightness_enabled: true,
            double_tap_seek: true,
            seek_sensitivity: 1.0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub language: Option<String>,
    pub theme: Theme,
    pub default_resolution: Option<String>,
    pub volume: u8,
    pub speed: f64,
    pub max_simultaneous: u32,
    pub playback: PlaybackSettings,
    pub subtitles: SubtitleSettings,
    pub gestures: GestureSettings,
    pub keybindings: Vec<Binding>,
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
            playback: PlaybackSettings::default(),
            subtitles: SubtitleSettings::default(),
            gestures: GestureSettings::default(),
            keybindings: Vec::new(),
        }
    }
}

impl Settings {
    pub fn sanitized(&self) -> Self {
        let mut s = self.clone();
        s.volume = s.volume.min(100);
        s.speed = s.speed.clamp(0.25, 4.0);
        s.max_simultaneous = s.max_simultaneous.clamp(1, 16);
        s.playback.seek_step_seconds = s.playback.seek_step_seconds.clamp(1.0, 120.0);
        s.playback.seek_step_long_seconds = s.playback.seek_step_long_seconds.clamp(5.0, 600.0);
        s.playback.volume_step = s.playback.volume_step.clamp(1, 50);
        s.playback.max_volume = s.playback.max_volume.clamp(100, 300);
        s.subtitles.font_size = s.subtitles.font_size.clamp(8, 200);
        s.subtitles.position = s.subtitles.position.min(150);
        s.gestures.seek_sensitivity = s.gestures.seek_sensitivity.clamp(0.25, 4.0);
        s
    }

    pub fn effective_language(&self, os_locale: Option<&str>) -> String {
        resolve_language(
            self.language.as_deref(),
            os_locale,
            i18n::SUPPORTED_LANGUAGES,
        )
    }
}

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
        assert_eq!(s.volume, 100);
        assert_eq!(s.effective_language(None), "en");
        assert!(s.playback.remember_position);
        assert!(s.subtitles.autoload);
        assert!(s.gestures.enabled);
    }

    #[test]
    fn sanitize_clamps_nested_ranges() {
        let mut s = Settings {
            volume: 250,
            ..Default::default()
        };
        s.subtitles.font_size = 9000;
        s.playback.max_volume = 9999;
        let s = s.sanitized();
        assert_eq!(s.volume, 100);
        assert_eq!(s.subtitles.font_size, 200);
        assert_eq!(s.playback.max_volume, 300);
    }

    #[test]
    fn language_resolution_order() {
        let sup = i18n::SUPPORTED_LANGUAGES;
        assert_eq!(resolve_language(Some("ko"), Some("en-US"), sup), "ko");
        assert_eq!(resolve_language(None, Some("ja-JP"), sup), "ja");
        assert_eq!(resolve_language(Some("xx"), Some("de"), sup), "en");
    }

    #[test]
    fn partial_json_loads_with_defaults() {
        let s: Settings = serde_json::from_str(r#"{"language":"en"}"#).unwrap();
        assert_eq!(s.volume, 100);
        assert!(s.playback.hardware_decoding);
    }
}
