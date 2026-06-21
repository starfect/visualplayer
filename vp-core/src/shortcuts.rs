//! Keyboard shortcut model and the default VLC/PotPlayer-style binding set.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Action {
    TogglePlay,
    Stop,
    SeekForward,
    SeekBackward,
    SeekForwardLong,
    SeekBackwardLong,
    NextFrame,
    PrevFrame,
    VolumeUp,
    VolumeDown,
    ToggleMute,
    ToggleFullscreen,
    PlaylistNext,
    PlaylistPrev,
    SpeedUp,
    SpeedDown,
    SpeedReset,
    Screenshot,
    ToggleSubtitles,
    CycleSubtitleTrack,
    CycleAudioTrack,
    SubtitleDelayInc,
    SubtitleDelayDec,
    AudioDelayInc,
    AudioDelayDec,
    TogglePlaylistPanel,
    ToggleSettings,
    ToggleAbLoop,
    CycleAspect,
    Rotate,
    ZoomIn,
    ZoomOut,
    ZoomReset,
    JumpStart,
    JumpEnd,
    NextChapter,
    PrevChapter,
    ToggleMiniPlayer,
    ToggleEqualizer,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyChord {
    pub key: String,
    #[serde(default)]
    pub ctrl: bool,
    #[serde(default)]
    pub shift: bool,
    #[serde(default)]
    pub alt: bool,
}

impl KeyChord {
    pub fn new(key: &str) -> Self {
        Self {
            key: normalize_key(key),
            ctrl: false,
            shift: false,
            alt: false,
        }
    }

    pub fn shifted(key: &str) -> Self {
        Self {
            shift: true,
            ..Self::new(key)
        }
    }

    pub fn ctrl(key: &str) -> Self {
        Self {
            ctrl: true,
            ..Self::new(key)
        }
    }
}

pub fn normalize_key(key: &str) -> String {
    match key {
        " " | "Spacebar" => "space".to_string(),
        other => other.to_ascii_lowercase(),
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Binding {
    pub chord: KeyChord,
    pub action: Action,
}

pub fn default_bindings() -> Vec<Binding> {
    use Action::*;
    let b = |chord: KeyChord, action: Action| Binding { chord, action };
    vec![
        b(KeyChord::new("space"), TogglePlay),
        b(KeyChord::new("k"), TogglePlay),
        b(KeyChord::new("arrowright"), SeekForward),
        b(KeyChord::new("arrowleft"), SeekBackward),
        b(KeyChord::new("l"), SeekForward),
        b(KeyChord::new("j"), SeekBackward),
        b(KeyChord::shifted("arrowright"), SeekForwardLong),
        b(KeyChord::shifted("arrowleft"), SeekBackwardLong),
        b(KeyChord::new("arrowup"), VolumeUp),
        b(KeyChord::new("arrowdown"), VolumeDown),
        b(KeyChord::new("m"), ToggleMute),
        b(KeyChord::new("f"), ToggleFullscreen),
        b(KeyChord::new("."), NextFrame),
        b(KeyChord::new(","), PrevFrame),
        b(KeyChord::new("]"), SpeedUp),
        b(KeyChord::new("["), SpeedDown),
        b(KeyChord::new("backspace"), SpeedReset),
        b(KeyChord::new("n"), PlaylistNext),
        b(KeyChord::new("p"), PlaylistPrev),
        b(KeyChord::new("s"), Screenshot),
        b(KeyChord::new("v"), ToggleSubtitles),
        b(KeyChord::new("c"), CycleSubtitleTrack),
        b(KeyChord::new("b"), CycleAudioTrack),
        b(KeyChord::new("g"), SubtitleDelayDec),
        b(KeyChord::new("h"), SubtitleDelayInc),
        b(KeyChord::shifted("g"), AudioDelayDec),
        b(KeyChord::shifted("h"), AudioDelayInc),
        b(KeyChord::new("tab"), TogglePlaylistPanel),
        b(KeyChord::ctrl(","), ToggleSettings),
        b(KeyChord::new("r"), ToggleAbLoop),
        b(KeyChord::new("a"), CycleAspect),
        b(KeyChord::ctrl("r"), Rotate),
        b(KeyChord::new("="), ZoomIn),
        b(KeyChord::new("-"), ZoomOut),
        b(KeyChord::new("0"), ZoomReset),
        b(KeyChord::new("home"), JumpStart),
        b(KeyChord::new("end"), JumpEnd),
        b(KeyChord::new("pagedown"), NextChapter),
        b(KeyChord::new("pageup"), PrevChapter),
        b(KeyChord::new("t"), ToggleMiniPlayer),
        b(KeyChord::new("e"), ToggleEqualizer),
    ]
}

pub fn resolve(bindings: &[Binding], chord: &KeyChord) -> Option<Action> {
    bindings
        .iter()
        .find(|b| &b.chord == chord)
        .map(|b| b.action)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn space_toggles_play() {
        let map = default_bindings();
        assert_eq!(resolve(&map, &KeyChord::new(" ")), Some(Action::TogglePlay));
    }

    #[test]
    fn shift_modifies_seek_length() {
        let map = default_bindings();
        assert_eq!(
            resolve(&map, &KeyChord::new("arrowright")),
            Some(Action::SeekForward)
        );
        assert_eq!(
            resolve(&map, &KeyChord::shifted("arrowright")),
            Some(Action::SeekForwardLong)
        );
    }

    #[test]
    fn unbound_returns_none() {
        let map = default_bindings();
        assert_eq!(resolve(&map, &KeyChord::new("q")), None);
    }
}
