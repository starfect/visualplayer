//! Local automatic subtitles via Whisper (whisper.cpp). Extracts 16 kHz mono PCM
//! with FFmpeg, runs inference, and writes a sibling `.srt`. Fully local — nothing
//! is uploaded. Compiled only with the `whisper` cargo feature.

use tauri::{AppHandle, State};
use vp_core::error::Result;

use crate::AppState;

/// Start an automatic-subtitle job; returns a task id (events on `task://*`).
#[tauri::command]
pub fn whisper_generate(
    app: AppHandle,
    state: State<AppState>,
    media_path: String,
    model: Option<String>,
    lang: Option<String>,
) -> Result<String> {
    #[cfg(feature = "whisper")]
    {
        imp::generate(
            app,
            state,
            media_path,
            model.unwrap_or_else(|| "base".into()),
            lang,
        )
    }
    #[cfg(not(feature = "whisper"))]
    {
        let _ = (&app, &state, &media_path, &model, &lang);
        Err(vp_core::error::Error::NotImplemented(
            "automatic subtitles require a build with the `whisper` feature",
        ))
    }
}

/// Download a ggml Whisper model (`tiny`/`base`/`small`/`medium`) on demand.
#[tauri::command]
pub fn whisper_download_model(app: AppHandle, model: Option<String>) -> Result<String> {
    #[cfg(feature = "whisper")]
    {
        imp::download_model(&app, &model.unwrap_or_else(|| "base".into()))
    }
    #[cfg(not(feature = "whisper"))]
    {
        let _ = (&app, &model);
        Err(vp_core::error::Error::NotImplemented(
            "automatic subtitles require a build with the `whisper` feature",
        ))
    }
}

#[cfg(feature = "whisper")]
mod imp {
    use std::path::{Path, PathBuf};
    use std::process::{Command, Stdio};
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    use tauri::{AppHandle, Manager, State};
    use vp_core::error::{Error, Result};

    use crate::sidecar;
    use crate::tasks::{self, TaskEvent};
    use crate::AppState;

    fn model_file(app: &AppHandle, model: &str) -> Result<PathBuf> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| Error::Io(e.to_string()))?;
        Ok(dir.join("models").join(format!("ggml-{model}.bin")))
    }

    pub fn download_model(app: &AppHandle, model: &str) -> Result<String> {
        let path = model_file(app, model)?;
        if path.exists() {
            return Ok(path.to_string_lossy().into_owned());
        }
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let url =
            format!("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{model}.bin");
        let response = ureq::get(&url)
            .call()
            .map_err(|e| Error::Io(e.to_string()))?;
        let mut reader = response.into_reader();
        let mut file = std::fs::File::create(&path)?;
        std::io::copy(&mut reader, &mut file).map_err(|e| Error::Io(e.to_string()))?;
        Ok(path.to_string_lossy().into_owned())
    }

    pub fn generate(
        app: AppHandle,
        state: State<AppState>,
        media_path: String,
        model: String,
        lang: Option<String>,
    ) -> Result<String> {
        if !Path::new(&media_path).exists() {
            return Err(Error::NotFound(media_path));
        }
        let model_path = model_file(&app, &model)?;
        if !model_path.exists() {
            return Err(Error::NotFound(format!(
                "whisper model not downloaded: {}",
                model_path.display()
            )));
        }

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
            let send =
                |percent: f64, status: &str, message: Option<String>, output: Option<String>| {
                    tasks::emit(
                        &app,
                        TaskEvent {
                            id: id.clone(),
                            kind: "whisper".into(),
                            percent,
                            status: status.into(),
                            message,
                            output,
                        },
                    );
                };
            send(5.0, "progress", None, None);

            let samples = match extract_audio(&ffmpeg, &media_path) {
                Ok(samples) => samples,
                Err(e) => return send(0.0, "error", Some(e), None),
            };
            if cancel.load(Ordering::Relaxed) {
                return send(0.0, "error", Some("cancelled".into()), None);
            }
            send(35.0, "progress", None, None);

            let srt = match transcribe(&model_path, &samples, lang.as_deref()) {
                Ok(srt) => srt,
                Err(e) => return send(0.0, "error", Some(e), None),
            };

            let out = Path::new(&media_path).with_extension("srt");
            if let Err(e) = std::fs::write(&out, srt) {
                return send(0.0, "error", Some(e.to_string()), None);
            }
            send(
                100.0,
                "done",
                None,
                Some(out.to_string_lossy().into_owned()),
            );
        });

        Ok(task_id)
    }

    fn extract_audio(ffmpeg: &Path, media: &str) -> std::result::Result<Vec<f32>, String> {
        let output = Command::new(ffmpeg)
            .args(["-i", media, "-ar", "16000", "-ac", "1", "-f", "f32le", "-"])
            .stderr(Stdio::null())
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err("ffmpeg audio extraction failed".into());
        }
        Ok(output
            .stdout
            .chunks_exact(4)
            .map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
            .collect())
    }

    fn transcribe(
        model: &Path,
        samples: &[f32],
        lang: Option<&str>,
    ) -> std::result::Result<String, String> {
        use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

        let model_str = model.to_str().ok_or("invalid model path")?;
        let ctx = WhisperContext::new_with_params(model_str, WhisperContextParameters::default())
            .map_err(|e| e.to_string())?;
        let mut state = ctx.create_state().map_err(|e| e.to_string())?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        if let Some(language) = lang {
            params.set_language(Some(language));
        }
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_special(false);

        state.full(params, samples).map_err(|e| e.to_string())?;

        let mut srt = String::new();
        for (idx, segment) in state.as_iter().enumerate() {
            let text = segment.to_str_lossy().map_err(|e| e.to_string())?;
            srt.push_str(&format!(
                "{}\n{} --> {}\n{}\n\n",
                idx + 1,
                fmt_ts(segment.start_timestamp()),
                fmt_ts(segment.end_timestamp()),
                text.trim()
            ));
        }
        Ok(srt)
    }

    fn fmt_ts(centiseconds: i64) -> String {
        let ms = centiseconds * 10;
        let h = ms / 3_600_000;
        let m = (ms / 60_000) % 60;
        let s = (ms / 1_000) % 60;
        let milli = ms % 1_000;
        format!("{h:02}:{m:02}:{s:02},{milli:03}")
    }
}
