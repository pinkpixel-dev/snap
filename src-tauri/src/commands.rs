use crate::models::{ExportResult, ExportSettings, ImageMetadata};
use crate::pipeline::Pipeline;

#[tauri::command]
pub fn inspect_image(path: String) -> Result<ImageMetadata, String> {
    Pipeline::read_metadata(&path)
}

#[tauri::command]
pub async fn get_preview_data_url(path: String, max_dim: Option<u32>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::get_preview_data_url(&path, max_dim)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn export_image(
    source_path: String,
    destination_path: String,
    settings: ExportSettings,
) -> Result<ExportResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::export(&source_path, &destination_path, settings)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn estimate_export_size(
    source_path: String,
    settings: ExportSettings,
) -> Result<u64, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut img = Pipeline::load_and_orient(&source_path)?;
        img = Pipeline::apply_transforms(
            img,
            settings.crop.as_ref(),
            settings.rotate,
            settings.flip_horizontal,
            settings.flip_vertical,
        );
        img = Pipeline::apply_resize(img, settings.resize.as_ref());

        let (bytes, _) = Pipeline::encode_to_bytes(
            &img,
            &settings.format,
            settings.quality,
            settings.flatten_background.as_deref(),
        )?;

        Ok(bytes.len() as u64)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn check_cutout_model(model_id: Option<String>) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || Pipeline::is_cutout_model_ready(model_id.as_deref()))
        .await
        .map_err(|e| format!("Task join error: {}", e))
}

#[tauri::command]
pub async fn download_cutout_model(
    model_id: Option<String>,
    hf_token: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::download_cutout_model(model_id.as_deref(), hf_token.as_deref())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn remove_background(
    path: String,
    model_id: Option<String>,
    hf_token: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::remove_background_data_url(&path, model_id.as_deref(), hf_token.as_deref(), Some(1920))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn check_upscale_model(model_id: Option<String>) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || Pipeline::is_upscale_model_ready(model_id.as_deref()))
        .await
        .map_err(|e| format!("Task join error: {}", e))
}

#[tauri::command]
pub async fn download_upscale_model(model_id: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::download_upscale_model(model_id.as_deref())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn upscale_image(
    source: String,
    model_id: Option<String>,
    scale: u32,
    max_dim: Option<u32>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::upscale_preview_data_url(&source, model_id.as_deref(), scale, max_dim)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

