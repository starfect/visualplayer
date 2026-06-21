//! Recently played media with resume positions.

use serde::{Deserialize, Serialize};

pub const DEFAULT_CAP: usize = 200;
const RESUME_MIN_SECONDS: f64 = 5.0;
const RESUME_TAIL_RATIO: f64 = 0.95;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default)]
    pub position_seconds: f64,
    #[serde(default)]
    pub duration_seconds: f64,
    #[serde(default)]
    pub last_opened: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct History {
    pub entries: Vec<HistoryEntry>,
    #[serde(default = "default_cap")]
    cap: usize,
}

fn default_cap() -> usize {
    DEFAULT_CAP
}

impl Default for History {
    fn default() -> Self {
        Self {
            entries: Vec::new(),
            cap: DEFAULT_CAP,
        }
    }
}

impl History {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_cap(cap: usize) -> Self {
        Self {
            entries: Vec::new(),
            cap: cap.max(1),
        }
    }

    pub fn record(
        &mut self,
        path: impl Into<String>,
        title: Option<String>,
        position_seconds: f64,
        duration_seconds: f64,
        now: u64,
    ) {
        let path = path.into();
        self.entries.retain(|e| e.path != path);
        self.entries.insert(
            0,
            HistoryEntry {
                path,
                title,
                position_seconds: position_seconds.max(0.0),
                duration_seconds: duration_seconds.max(0.0),
                last_opened: now,
            },
        );
        self.entries.truncate(self.cap);
    }

    pub fn resume_position(&self, path: &str) -> Option<f64> {
        let entry = self.entries.iter().find(|e| e.path == path)?;
        let near_end = entry.duration_seconds > 0.0
            && entry.position_seconds >= entry.duration_seconds * RESUME_TAIL_RATIO;
        if entry.position_seconds >= RESUME_MIN_SECONDS && !near_end {
            Some(entry.position_seconds)
        } else {
            None
        }
    }

    pub fn remove(&mut self, path: &str) -> bool {
        let before = self.entries.len();
        self.entries.retain(|e| e.path != path);
        before != self.entries.len()
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }

    pub fn most_recent(&self, n: usize) -> &[HistoryEntry] {
        &self.entries[..n.min(self.entries.len())]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_dedupes_and_moves_to_front() {
        let mut h = History::new();
        h.record("/a.mkv", None, 0.0, 0.0, 1);
        h.record("/b.mkv", None, 0.0, 0.0, 2);
        h.record("/a.mkv", None, 30.0, 100.0, 3);
        assert_eq!(h.entries.len(), 2);
        assert_eq!(h.entries[0].path, "/a.mkv");
        assert_eq!(h.entries[0].position_seconds, 30.0);
    }

    #[test]
    fn cap_limits_length() {
        let mut h = History::with_cap(2);
        for i in 0..5 {
            h.record(format!("/{i}.mkv"), None, 0.0, 0.0, i as u64);
        }
        assert_eq!(h.entries.len(), 2);
        assert_eq!(h.entries[0].path, "/4.mkv");
    }

    #[test]
    fn resume_ignores_trivial_and_finished() {
        let mut h = History::new();
        h.record("/short.mkv", None, 2.0, 100.0, 1);
        assert_eq!(h.resume_position("/short.mkv"), None);
        h.record("/mid.mkv", None, 50.0, 100.0, 2);
        assert_eq!(h.resume_position("/mid.mkv"), Some(50.0));
        h.record("/done.mkv", None, 99.0, 100.0, 3);
        assert_eq!(h.resume_position("/done.mkv"), None);
    }
}
