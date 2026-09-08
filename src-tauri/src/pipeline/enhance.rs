use std::path::PathBuf;
use image::{DynamicImage, GenericImageView, Rgba, RgbaImage};
use ndarray::Array4;
use ort::session::Session;
use super::model_cache::{self, ModelSpec};
use super::Pipeline;

/// IAT ships each variant as a small graph plus an external-data weight file.
pub const IAT_LOL_V2: ModelSpec = ModelSpec {
    id: "iat-lol-v2",
    filename: "iat_lol_v2.onnx",
    primary_url: "https://huggingface.co/eleasm/IAT-ONNX/resolve/main/onnx/iat_lol_v2.onnx",
    fallback_url: None,
    candidates: &["iat_lol_v2.onnx"],
    min_size: 40_000,
    companions: &[(
        "iat_lol_v2.onnx.data",
        "https://huggingface.co/eleasm/IAT-ONNX/resolve/main/onnx/iat_lol_v2.onnx.data",
    )],
};

pub const IAT_LOL_V1: ModelSpec = ModelSpec {
    id: "iat-lol-v1",
    filename: "iat_lol_v1.onnx",
    primary_url: "https://huggingface.co/eleasm/IAT-ONNX/resolve/main/onnx/iat_lol_v1.onnx",
    fallback_url: None,
    candidates: &["iat_lol_v1.onnx"],
    min_size: 40_000,
    companions: &[(
        "iat_lol_v1.onnx.data",
        "https://huggingface.co/eleasm/IAT-ONNX/resolve/main/onnx/iat_lol_v1.onnx.data",
    )],
};

pub const IAT_EXPOSURE: ModelSpec = ModelSpec {
    id: "iat-exposure",
    filename: "iat_exposure.onnx",
    primary_url: "https://huggingface.co/eleasm/IAT-ONNX/resolve/main/onnx/iat_exposure.onnx",
    fallback_url: None,
    candidates: &["iat_exposure.onnx"],
    min_size: 40_000,
    companions: &[(
        "iat_exposure.onnx.data",
        "https://huggingface.co/eleasm/IAT-ONNX/resolve/main/onnx/iat_exposure.onnx.data",
    )],
};

pub struct EnhanceEngine;

impl EnhanceEngine {
    pub fn get_spec(model_id: Option<&str>) -> &'static ModelSpec {
        match model_id.unwrap_or("iat-lol-v2").trim().to_lowercase().as_str() {
            "iat-lol-v1" | "lol-v1" => &IAT_LOL_V1,
            "iat-exposure" | "exposure" => &IAT_EXPOSURE,
            _ => &IAT_LOL_V2,
        }
    }

    pub fn is_model_ready(model_id: Option<&str>) -> bool {
        model_cache::is_model_ready(Self::get_spec(model_id))
    }

    pub fn ensure_model(model_id: Option<&str>) -> Result<PathBuf, String> {
        model_cache::ensure_model(Self::get_spec(model_id))
    }

    /// Runs IAT over the whole image at once. The model is ~90K parameters and
    /// fully convolutional in its local branch, so tiling buys nothing here and
    /// would risk visible seams in the global color correction.
    pub fn enhance(img: &DynamicImage, model_id: Option<&str>) -> Result<DynamicImage, String> {
        let model_path = Self::ensure_model(model_id)?;

        let mut builder = Session::builder()
            .map_err(|e| format!("Failed to create session builder: {}", e))?;

        if Pipeline::is_cuda_available() {
            builder = builder
                .with_execution_providers([
                    ort::ep::CUDA::default().build(),
                    ort::ep::CPU::default().build(),
                ])
                .map_err(|e| format!("Failed to configure execution providers: {}", e))?;
        } else {
            builder = builder
                .with_execution_providers([ort::ep::CPU::default().build()])
                .map_err(|e| format!("Failed to configure CPU execution provider: {}", e))?;
        }

        let mut session = builder
            .with_intra_threads(4)
            .map_err(|e| format!("Failed to configure intra threads: {}", e))?
            .with_inter_threads(1)
            .map_err(|e| format!("Failed to configure inter threads: {}", e))?
            .commit_from_file(&model_path)
            .map_err(|e| format!("Failed to load ONNX enhancement model: {}", e))?;

        let (w, h) = img.dimensions();
        if w == 0 || h == 0 {
            return Err("Cannot enhance empty image".to_string());
        }

        let has_alpha = img.color().has_alpha();
        let rgb = img.to_rgb8();

        let mut input_array = Array4::<f32>::zeros((1, 3, h as usize, w as usize));
        for y in 0..h {
            for x in 0..w {
                let px = rgb.get_pixel(x, y);
                input_array[[0, 0, y as usize, x as usize]] = px[0] as f32 / 255.0;
                input_array[[0, 1, y as usize, x as usize]] = px[1] as f32 / 255.0;
                input_array[[0, 2, y as usize, x as usize]] = px[2] as f32 / 255.0;
            }
        }

        let input_tensor = ort::value::Tensor::from_array(input_array)
            .map_err(|e| format!("Failed to create input tensor: {}", e))?;

        let outputs = session
            .run(ort::inputs![input_tensor])
            .map_err(|e| format!("Enhancement inference failed: {}", e))?;

        // IAT returns three tensors: the per-pixel `mul` and `add` maps, then the
        // finished `enhanced` image. Only the last one is the result.
        let enhanced = outputs
            .into_iter()
            .find(|(name, _)| name.to_string() == "enhanced")
            .map(|(_, tensor)| tensor)
            .ok_or_else(|| "Model did not return an 'enhanced' output".to_string())?;

        let (shape, data) = enhanced
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("Failed to extract output tensor: {}", e))?;

        let out_h = shape[2] as u32;
        let out_w = shape[3] as u32;
        if out_w != w || out_h != h {
            return Err(format!(
                "Enhancement model returned {}x{} for a {}x{} image",
                out_w, out_h, w, h
            ));
        }

        let stride = (out_w * out_h) as usize;
        let mut out_rgb = image::RgbImage::new(w, h);
        for y in 0..h {
            for x in 0..w {
                let idx = (y * w + x) as usize;
                let r = (data.get(idx).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                let g = (data.get(idx + stride).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                let b = (data.get(idx + stride * 2).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                out_rgb.put_pixel(x, y, image::Rgb([r, g, b]));
            }
        }

        if has_alpha {
            let src_rgba = img.to_rgba8();
            let mut out_rgba = RgbaImage::new(w, h);
            for y in 0..h {
                for x in 0..w {
                    let p = out_rgb.get_pixel(x, y);
                    let a = src_rgba.get_pixel(x, y)[3];
                    out_rgba.put_pixel(x, y, Rgba([p[0], p[1], p[2], a]));
                }
            }
            Ok(DynamicImage::ImageRgba8(out_rgba))
        } else {
            Ok(DynamicImage::ImageRgb8(out_rgb))
        }
    }
}
