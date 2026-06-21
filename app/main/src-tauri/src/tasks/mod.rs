//! Background-task helpers: id generation and a shared progress-event payload.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

static COUNTER: AtomicU64 = AtomicU64::new(1);

pub fn new_id() -> String {
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("task-{ms}-{n}")
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskEvent {
    pub id: String,
    pub kind: String,
    pub percent: f64,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
}

/// Emit `task://<status>` (progress/done/error) for the frontend tasks store.
pub fn emit(app: &AppHandle, event: TaskEvent) {
    let channel = format!("task://{}", event.status);
    let _ = app.emit(&channel, event);
}
