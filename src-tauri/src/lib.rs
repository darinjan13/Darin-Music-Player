use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_shell::ShellExt;
use std::fs; // For copying files

#[tauri::command]
async fn download_youtube_audio(
    app: tauri::AppHandle,
    url: String,
    save_path: String,
) -> Result<String, String> {
    let resource_path = app
        .path()
        .resolve("bin", tauri::path::BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;

    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args([
            "--ffmpeg-location",
            resource_path.to_str().unwrap(),
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "0",
            "-o",
            &format!("{}/%(title)s.%(ext)s", save_path),
            &url,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Download complete! Check your library.".into())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("Download failed: {}", err))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // --- 1. PROVISIONING LOGIC (THE HIDDEN FOLDER SETUP) ---
            let app_data_dir = app.path().app_data_dir().expect("Failed to find AppData dir");
            let vault_path = app_data_dir.join(".idx_vault");

            // Only copy if the vault folder doesn't exist yet
            if !vault_path.exists() {
                let _ = fs::create_dir_all(&vault_path);
                
                // Find where we put the starter images in the build
                if let Ok(resource_path) = app.path().resolve("starter_assets", tauri::path::BaseDirectory::Resource) {
                    if let Ok(entries) = fs::read_dir(resource_path) {
                        for entry in entries.flatten() {
                            let target = vault_path.join(entry.file_name());
                            let _ = fs::copy(entry.path(), target);
                        }
                    }
                }
            }

            // --- 2. TRAY ICON & MENU LOGIC (YOUR EXISTING CODE) ---
            let icon = app.default_window_icon().unwrap().clone();
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Darin Gwapo Player")
                .menu(&menu)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::DoubleClick {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let window = app.get_webview_window("main").unwrap();
            match event.id().as_ref() {
                "show" => {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                "hide" => {
                    let _ = window.hide();
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![download_youtube_audio])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}