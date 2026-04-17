use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Emitter;

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn get_file_name(path: String) -> String {
    PathBuf::from(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
}

struct WatchedFile(Mutex<Option<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WatchedFile(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![read_markdown_file, get_file_name])
        .setup(|app| {
            // Check if a file path was passed as CLI argument
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let path = args[1].clone();
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    let _ = handle.emit("open-file", path);
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
