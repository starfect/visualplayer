//! Container/codec conversion via FFmpeg. Spawns ffmpeg, parses progress from its
//! stderr, and streams `task://progress|done|error` events. Cancellable.

use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::{AppHandle, State};
use vp_core::error::{Error, Result};

use crate::sidecar;
use crate::tasks::{self, TaskEvent};
use crate::AppState;

fn parse_hms(value: &str) -> Option<f64> {
    let parts: Vec<&str> = value.trim().split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let h: f64 = parts[0].parse().ok()?;
    let m: f64 = parts[1].parse().ok()?;
    let s: f64 = parts[2].parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + s)
}

#[tauri::command]
pub fn convert_media(
    app: AppHandle,
    state: State<AppState>,
    input: String,
    target_ext: String,
    _opts: Option<serde_json::Value>,
) -> Result<String> {
    let in_path = std::path::Path::new(&input);
    if !in_path.exists() {
        return Err(Error::NotFound(input));
    }
    let output = in_path.with_extension(target_ext.trim_start_matches('.'));
    let output_str = output.to_string_lossy().into_owned();

    let task_id = tasks::new_id();
    let cancel = Arc::new(AtomicBool::new(false));
    state
        .tasks
        .lock()
        .unwrap()
        .insert(task_id.clone(), cancel.clone());

    let ffmpeg = sidecar::resolve(&app, "ffmpeg");
    let app = app.clone();
    let id = task_id.clone();

    std::thread::spawn(move || {
        let send = |percent: f64, status: &str, message: Option<String>, output: Option<String>| {
            tasks::emit(
                &app,
                TaskEvent {
                    id: id.clone(),
                    kind: "convert".into(),
                    percent,
                    status: status.into(),
                    message,
                    output,
                },
            );
        };
        send(0.0, "progress", None, None);

        let spawned = Command::new(&ffmpeg)
            .args(["-y", "-i", &input, &output_str])
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn();
        let mut child = match spawned {
            Ok(child) => child,
            Err(e) => return send(0.0, "error", Some(e.to_string()), None),
        };

        let mut total: Option<f64> = None;
        if let Some(stderr) = child.stderr.take() {
            for line in BufReader::new(stderr)
                .lines()
                .map_while(std::result::Result::ok)
            {
                if cancel.load(Ordering::Relaxed) {
                    let _ = child.kill();
                    return send(0.0, "error", Some("cancelled".into()), None);
                }
                if total.is_none() {
                    if let Some(idx) = line.find("Duration:") {
                        total = parse_hms(line[idx + 9..].split(',').next().unwrap_or(""));
                    }
                }
                if let Some(idx) = line.find("time=") {
                    let current = line[idx + 5..].split_whitespace().next().unwrap_or("");
                    if let (Some(cur), Some(tot)) = (parse_hms(current), total) {
                        if tot > 0.0 {
                            send((cur / tot * 100.0).min(99.0), "progress", None, None);
                        }
                    }
                }
            }
        }

        match child.wait() {
            Ok(status) if status.success() => send(100.0, "done", None, Some(output_str.clone())),
            Ok(status) => send(0.0, "error", Some(format!("ffmpeg exited: {status}")), None),
            Err(e) => send(0.0, "error", Some(e.to_string()), None),
        }
    });

    Ok(task_id)
}
