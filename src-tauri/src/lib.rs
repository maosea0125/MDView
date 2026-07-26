use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use tauri::{Emitter, Manager};

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn get_file_name(path: String) -> String {
    PathBuf::from(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or(path)
}

/// Pending file paths from file associations or CLI, waiting for frontend ready
struct PendingFiles(Mutex<Vec<String>>);

impl PendingFiles {
    fn lock(&self) -> MutexGuard<'_, Vec<String>> {
        // A poisoned lock only means another thread panicked mid-push; the Vec is still usable
        self.0.lock().unwrap_or_else(|e| e.into_inner())
    }
}

/// Frontend calls this to get any files that need to be opened
#[tauri::command]
fn get_pending_files(state: tauri::State<PendingFiles>) -> Vec<String> {
    state.lock().drain(..).collect()
}

/// Trigger the native print dialog for the current webview
#[tauri::command]
fn print_page(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

/// Write binary data to a file path (used for Word/DOCX export).
/// The data arrives as a raw IPC body (no JSON array overhead); the target
/// path is percent-encoded in the `path` header since headers must be ASCII.
#[tauri::command]
fn write_binary_file(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let path = request
        .headers()
        .get("path")
        .ok_or("missing path header")?
        .to_str()
        .map_err(|e| e.to_string())?;
    let path = percent_encoding::percent_decode_str(path)
        .decode_utf8()
        .map_err(|e| e.to_string())?;
    let tauri::ipc::InvokeBody::Raw(data) = request.body() else {
        return Err("expected binary body".into());
    };
    fs::write(path.as_ref(), data).map_err(|e| format!("Failed to write file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(PendingFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![read_markdown_file, get_file_name, get_pending_files, print_page, write_binary_file])
        .setup(|app| {
            // Queue any file paths passed as CLI arguments
            let pending = app.state::<PendingFiles>();
            pending.lock().extend(std::env::args().skip(1));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        if let Some(p) = path.to_str() {
                            let _ = app.emit("open-file", p.to_string());
                            if let Some(state) = app.try_state::<PendingFiles>() {
                                state.lock().push(p.to_string());
                            }
                        }
                    }
                }
            }
            let _ = (app, event);
        });
}
