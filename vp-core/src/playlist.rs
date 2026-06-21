//! Playlist model and navigation.
//!
//! Pure and deterministic: shuffling uses a small seeded xorshift PRNG instead of
//! `rand`, so navigation order is reproducible and unit-testable.

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};

/// Repeat behaviour applied when a track ends.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RepeatMode {
    /// Stop after the last item.
    #[default]
    Off,
    /// Repeat the current item.
    One,
    /// Loop the whole list.
    All,
}

/// A single entry in the playlist.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlaylistItem {
    /// Stable id for the lifetime of the playlist (used by remove/reorder/select).
    pub id: u64,
    /// Local path or URL to the media.
    pub path: String,
    /// Optional display title; falls back to the file name in the UI.
    pub title: Option<String>,
}

/// An ordered list of media with a current selection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    /// Items in display order.
    pub items: Vec<PlaylistItem>,
    /// Index into `items` of the current selection, if any.
    pub index: Option<usize>,
    /// Repeat behaviour.
    pub repeat: RepeatMode,
    /// Whether navigation follows a shuffled order.
    pub shuffle: bool,
    #[serde(default)]
    next_id: u64,
    #[serde(default)]
    seed: u64,
}

impl Default for Playlist {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            index: None,
            repeat: RepeatMode::Off,
            shuffle: false,
            next_id: 0,
            // Non-zero default so the xorshift PRNG is well-behaved before a
            // caller supplies an explicit seed.
            seed: 0x9E37_79B9_7F4A_7C15,
        }
    }
}

impl Playlist {
    /// Create an empty playlist.
    pub fn new() -> Self {
        Self::default()
    }

    /// Number of items.
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// `true` if there are no items.
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// The currently selected item, if any.
    pub fn current(&self) -> Option<&PlaylistItem> {
        self.index.and_then(|i| self.items.get(i))
    }

    /// Append an item, returning its new id. Selects it if the list was empty.
    pub fn add(&mut self, path: impl Into<String>, title: Option<String>) -> u64 {
        let id = self.next_id;
        self.next_id += 1;
        self.items.push(PlaylistItem {
            id,
            path: path.into(),
            title,
        });
        if self.index.is_none() {
            self.index = Some(0);
        }
        id
    }

    /// Remove the item with `id`, keeping the current selection pointing at a
    /// sensible neighbour. Returns the removed item, or `None` if not found.
    pub fn remove(&mut self, id: u64) -> Option<PlaylistItem> {
        let pos = self.items.iter().position(|it| it.id == id)?;
        let removed = self.items.remove(pos);
        self.index = match self.index {
            _ if self.items.is_empty() => None,
            Some(cur) if pos < cur => Some(cur - 1),
            Some(cur) if pos == cur => Some(cur.min(self.items.len() - 1)),
            other => other,
        };
        Some(removed)
    }

    /// Move the item at `from` to position `to`, preserving the current selection.
    pub fn reorder(&mut self, from: usize, to: usize) -> Result<()> {
        let n = self.items.len();
        if from >= n || to >= n {
            return Err(Error::InvalidArgument(format!(
                "reorder out of range: {from}->{to} (len {n})"
            )));
        }
        if from == to {
            return Ok(());
        }
        let item = self.items.remove(from);
        self.items.insert(to, item);
        if let Some(cur) = self.index {
            self.index = Some(reindex_after_move(cur, from, to));
        }
        Ok(())
    }

    /// Select the item with `id`. Returns an error if no such item exists.
    pub fn select(&mut self, id: u64) -> Result<()> {
        let pos = self
            .items
            .iter()
            .position(|it| it.id == id)
            .ok_or_else(|| Error::InvalidArgument(format!("no item with id {id}")))?;
        self.index = Some(pos);
        Ok(())
    }

    /// Remove every item and clear the selection.
    pub fn clear(&mut self) {
        self.items.clear();
        self.index = None;
    }

    /// Set the repeat mode.
    pub fn set_repeat(&mut self, mode: RepeatMode) {
        self.repeat = mode;
    }

    /// Enable/disable shuffle. When enabling, an optional `seed` makes the
    /// shuffled order reproducible (otherwise the existing seed is kept).
    pub fn set_shuffle(&mut self, enabled: bool, seed: Option<u64>) {
        self.shuffle = enabled;
        if let Some(s) = seed {
            self.seed = s.max(1);
        }
    }

    /// Advance to the next item in navigation order. Wraps only when repeat is
    /// [`RepeatMode::All`]; returns `None` at the end otherwise.
    // Domain method named `next`/`prev` by intent; not an `Iterator`.
    #[allow(clippy::should_implement_trait)]
    pub fn next(&mut self) -> Option<&PlaylistItem> {
        self.step(1)
    }

    /// Go to the previous item in navigation order (same wrap rules as [`next`]).
    ///
    /// [`next`]: Playlist::next
    pub fn prev(&mut self) -> Option<&PlaylistItem> {
        self.step(-1)
    }

    /// What to play when the current track ends naturally: repeats the current
    /// item under [`RepeatMode::One`], otherwise behaves like [`next`].
    ///
    /// [`next`]: Playlist::next
    pub fn on_track_end(&mut self) -> Option<&PlaylistItem> {
        match self.repeat {
            RepeatMode::One => self.current(),
            _ => self.next(),
        }
    }

    /// Navigation order (identity, or a seeded shuffle when `shuffle` is on).
    fn order(&self) -> Vec<usize> {
        let n = self.items.len();
        if !self.shuffle || n <= 1 {
            (0..n).collect()
        } else {
            shuffled_order(n, self.seed)
        }
    }

    fn step(&mut self, delta: isize) -> Option<&PlaylistItem> {
        let order = self.order();
        let cur = self.index?;
        let p = order.iter().position(|&i| i == cur)?;
        let len = order.len();
        let next_p = match (p as isize) + delta {
            v if v < 0 => {
                if self.repeat == RepeatMode::All {
                    len - 1
                } else {
                    return None;
                }
            }
            v if (v as usize) >= len => {
                if self.repeat == RepeatMode::All {
                    0
                } else {
                    return None;
                }
            }
            v => v as usize,
        };
        self.index = Some(order[next_p]);
        self.current()
    }
}

/// Recompute an index after the item at `from` is moved to `to`.
fn reindex_after_move(cur: usize, from: usize, to: usize) -> usize {
    if cur == from {
        to
    } else if from < cur && cur <= to {
        cur - 1
    } else if to <= cur && cur < from {
        cur + 1
    } else {
        cur
    }
}

/// Deterministic Fisher–Yates shuffle of `0..n` driven by a xorshift64 PRNG.
fn shuffled_order(n: usize, seed: u64) -> Vec<usize> {
    let mut order: Vec<usize> = (0..n).collect();
    let mut state = seed.max(1);
    for i in (1..n).rev() {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        let j = (state % (i as u64 + 1)) as usize;
        order.swap(i, j);
    }
    order
}

#[cfg(test)]
mod tests {
    use super::*;

    fn list_of(n: usize) -> Playlist {
        let mut p = Playlist::new();
        for i in 0..n {
            p.add(format!("/m/{i}.mkv"), None);
        }
        p
    }

    #[test]
    fn add_selects_first_item() {
        let mut p = Playlist::new();
        assert!(p.is_empty() && p.current().is_none());
        let id = p.add("/a.mkv", Some("A".into()));
        assert_eq!(p.len(), 1);
        assert_eq!(p.current().unwrap().id, id);
    }

    #[test]
    fn next_prev_stop_at_ends_when_repeat_off() {
        let mut p = list_of(3); // index 0
        assert_eq!(p.next().map(|i| i.path.clone()), Some("/m/1.mkv".into()));
        assert_eq!(p.next().map(|i| i.path.clone()), Some("/m/2.mkv".into()));
        assert!(p.next().is_none()); // at end, repeat off
        assert_eq!(p.index, Some(2));
        assert_eq!(p.prev().map(|i| i.path.clone()), Some("/m/1.mkv".into()));
    }

    #[test]
    fn repeat_all_wraps() {
        let mut p = list_of(2);
        p.set_repeat(RepeatMode::All);
        p.index = Some(1);
        assert_eq!(p.next().map(|i| i.id), Some(0));
        assert_eq!(p.prev().map(|i| i.id), Some(1));
    }

    #[test]
    fn repeat_one_replays_current_on_track_end() {
        let mut p = list_of(3);
        p.index = Some(1);
        p.set_repeat(RepeatMode::One);
        assert_eq!(p.on_track_end().map(|i| i.id), Some(1));
    }

    #[test]
    fn remove_fixes_selection() {
        let mut p = list_of(3);
        let id1 = p.items[1].id;
        p.index = Some(2);
        p.remove(id1);
        // item at 2 shifted down to 1
        assert_eq!(p.index, Some(1));
        assert_eq!(p.len(), 2);
        assert!(p.remove(9999).is_none());
    }

    #[test]
    fn remove_last_clears_selection() {
        let mut p = list_of(1);
        let id = p.items[0].id;
        p.remove(id);
        assert!(p.is_empty());
        assert_eq!(p.index, None);
    }

    #[test]
    fn reorder_keeps_current_item() {
        let mut p = list_of(4);
        let current_id = p.items[3].id;
        p.index = Some(3);
        p.reorder(3, 0).unwrap(); // move last to front
        assert_eq!(p.items[0].id, current_id);
        assert_eq!(p.current().unwrap().id, current_id);
        assert!(p.reorder(0, 9).is_err());
    }

    #[test]
    fn shuffle_is_deterministic_and_a_permutation() {
        let a = shuffled_order(8, 42);
        let b = shuffled_order(8, 42);
        assert_eq!(a, b, "same seed must reproduce");
        let mut sorted = a.clone();
        sorted.sort_unstable();
        assert_eq!(sorted, (0..8).collect::<Vec<_>>(), "must be a permutation");
        assert_ne!(shuffled_order(8, 42), shuffled_order(8, 7));
    }

    #[test]
    fn shuffle_navigation_visits_every_item_once() {
        // Over one full cycle (repeat All), shuffled navigation must touch every
        // item exactly once regardless of where the current selection starts.
        let mut p = list_of(5);
        p.set_shuffle(true, Some(123));
        p.set_repeat(RepeatMode::All);
        let mut seen = vec![p.index.unwrap()];
        for _ in 0..4 {
            p.next();
            seen.push(p.index.unwrap());
        }
        seen.sort_unstable();
        seen.dedup();
        assert_eq!(seen.len(), 5, "every item visited exactly once");
    }
}
