use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub file_size: u64,
    pub has_alpha: bool,
    pub exif_orientation: Option<u32>,
    pub camera_model: Option<String>,
    pub date_taken: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CropSettings {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResizeSettings {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub preserve_aspect_ratio: bool,
    pub fit_mode: Option<String>, // "contain", "cover", "stretch"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSettings {
    pub crop: Option<CropSettings>,
    pub rotate: Option<i32>, // 0, 90, 180, 270
    pub flip_horizontal: Option<bool>,
    pub flip_vertical: Option<bool>,
    pub resize: Option<ResizeSettings>,
    pub format: String, // "png", "jpeg", "webp"
    pub quality: Option<u8>, // 1..=100
    pub flatten_background: Option<String>, // hex code e.g. "#ffffff"
    pub strip_metadata: bool,
    pub remove_background: Option<bool>,
    pub cutout_model: Option<String>,
    pub upscale_scale: Option<u32>, // 2, 4
    pub upscale_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub original_size: u64,
    pub output_size: u64,
    pub saved_bytes: i64,
    pub saved_percentage: f64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptPoint {
    pub x: f32, // normalized 0.0 .. 1.0
    pub y: f32, // normalized 0.0 .. 1.0
    pub label: i64, // 1 = positive / include, 0 = negative / exclude
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamMaskResult {
    pub mask_data_url: String,
    pub score: f32,
    pub bounds: Option<CropSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamEffectSettings {
    pub effect: String, // "cutout", "blur", "color_splash", "adjustments"
    pub blur_radius: Option<f32>,
    pub invert: Option<bool>,
    pub target: Option<String>, // "subject" or "background"
    pub brightness: Option<f32>, // -1.0 .. 1.0
    pub contrast: Option<f32>, // -1.0 .. 1.0
    pub saturation: Option<f32>, // -1.0 .. 1.0
}
