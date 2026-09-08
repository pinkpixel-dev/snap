pub mod commands;
pub mod models;
pub mod pipeline;

#[cfg(target_os = "linux")]
fn configure_appimage_gio_modules() {
    if std::env::var_os("APPIMAGE").is_some() {
        const DISABLED_GIO_PATH: &str = "/__snap_appimage_disabled_gio_modules__";
        std::env::set_var("GIO_MODULE_DIR", DISABLED_GIO_PATH);
        std::env::set_var("GIO_EXTRA_MODULES", DISABLED_GIO_PATH);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    configure_appimage_gio_modules();

    let sam_state: crate::pipeline::sam::SharedSamState = std::sync::Arc::new(std::sync::Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(sam_state)
        .invoke_handler(tauri::generate_handler![
            commands::inspect_image,
            commands::get_preview_data_url,
            commands::export_image,
            commands::estimate_export_size,
            commands::check_cutout_model,
            commands::download_cutout_model,
            commands::remove_background,
            commands::check_upscale_model,
            commands::download_upscale_model,
            commands::upscale_image,
            commands::check_restore_model,
            commands::download_restore_model,
            commands::restore_image,
            commands::check_enhance_model,
            commands::download_enhance_model,
            commands::enhance_image,
            commands::check_colorize_model,
            commands::download_colorize_model,
            commands::colorize_image,
            commands::check_sam_model,
            commands::download_sam_model,
            commands::init_sam_session,
            commands::decode_sam_mask,
            commands::apply_sam_effect,
            commands::check_lama_model,
            commands::download_lama_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running snap application");
}
