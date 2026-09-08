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

#[tauri::command]
pub async fn check_restore_model(model_id: Option<String>) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || Pipeline::is_restore_model_ready(model_id.as_deref()))
        .await
        .map_err(|e| format!("Task join error: {}", e))
}

#[tauri::command]
pub async fn download_restore_model(model_id: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::download_restore_model(model_id.as_deref())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn restore_image(
    source: String,
    model_id: Option<String>,
    max_dim: Option<u32>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::restore_preview_data_url(&source, model_id.as_deref(), max_dim)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn check_enhance_model(model_id: Option<String>) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || Pipeline::is_enhance_model_ready(model_id.as_deref()))
        .await
        .map_err(|e| format!("Task join error: {}", e))
}

#[tauri::command]
pub async fn download_enhance_model(model_id: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::download_enhance_model(model_id.as_deref())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn enhance_image(
    source: String,
    model_id: Option<String>,
    max_dim: Option<u32>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::enhance_preview_data_url(&source, model_id.as_deref(), max_dim)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn check_colorize_model() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(Pipeline::is_colorize_model_ready)
        .await
        .map_err(|e| format!("Task join error: {}", e))
}

#[tauri::command]
pub async fn download_colorize_model() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(Pipeline::download_colorize_model)
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn colorize_image(source: String, max_dim: Option<u32>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::colorize_preview_data_url(&source, max_dim)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn check_sam_model() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || Pipeline::is_sam_model_ready())
        .await
        .map_err(|e| format!("Task join error: {}", e))
}

#[tauri::command]
pub async fn download_sam_model() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || Pipeline::download_sam_model())
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn init_sam_session(
    source: String,
    state: tauri::State<'_, crate::pipeline::sam::SharedSamState>,
) -> Result<(), String> {
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::init_sam_session(&source, &state_clone)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn decode_sam_mask(
    points: Vec<crate::models::PromptPoint>,
    state: tauri::State<'_, crate::pipeline::sam::SharedSamState>,
) -> Result<crate::models::SamMaskResult, String> {
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::decode_sam_mask(&points, &state_clone)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn apply_sam_effect(
    source: String,
    settings: crate::models::SamEffectSettings,
    state: tauri::State<'_, crate::pipeline::sam::SharedSamState>,
) -> Result<String, String> {
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        Pipeline::apply_sam_effect(&source, &settings, &state_clone)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

