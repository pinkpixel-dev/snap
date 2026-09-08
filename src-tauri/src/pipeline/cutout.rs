use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use directories::ProjectDirs;
use image::{DynamicImage, GenericImageView, GrayImage, Luma};
use ndarray::Array4;
use ort::session::Session;

pub struct ModelSpec {
    pub id: &'static str,
    pub filename: &'static str,
    pub primary_url: &'static str,
    pub fallback_url: Option<&'static str>,
    pub candidates: &'static [&'static str],
    pub min_size: u64,
    pub resolution: (u32, u32),
}

pub const RMBG_SPEC: ModelSpec = ModelSpec {
    id: "rmbg-2.0",
    filename: "rmbg-2.0-int8.onnx",
    primary_url: "https://huggingface.co/briaai/RMBG-2.0/resolve/main/onnx/model_int8.onnx",
    fallback_url: Some("https://huggingface.co/yamura4/RMBG-2.0-ONNX/resolve/main/onnx/model_int8.onnx"),
    candidates: &["rmbg-2.0-int8.onnx", "rmbg-2.0.onnx", "model_int8.onnx"],
    min_size: 100_000_000,
    resolution: (1024, 1024),
};

pub const LUCIDA_SPEC: ModelSpec = ModelSpec {
    id: "lucida-onnx",
    filename: "lucida.onnx",
    primary_url: "https://huggingface.co/PinkPixel/lucida-onnx/resolve/main/model.onnx",
    fallback_url: None,
    candidates: &["lucida.onnx", "model.onnx"],
    min_size: 100_000_000,
    resolution: (1024, 1024),
};

pub const BIREFNET_HR_SPEC: ModelSpec = ModelSpec {
    id: "birefnet-hr",
    filename: "birefnet-hr-matting.onnx",
    primary_url: "https://huggingface.co/PinkPixel/birefnet-hr-matting-onnx/resolve/main/model.onnx",
    fallback_url: None,
    candidates: &["birefnet-hr-matting.onnx", "BiRefNet_HR-matting.onnx", "model.onnx"],
    min_size: 100_000_000,
    resolution: (2048, 2048),
};

pub const FEY_NOBG_SPEC: ModelSpec = ModelSpec {
    id: "fey-nobg",
    filename: "fey-nobg.onnx",
    primary_url: "https://huggingface.co/PinkPixel/fey-nobg-onnx/resolve/main/model.onnx",
    fallback_url: None,
    candidates: &["fey-nobg.onnx", "FeyNobg.onnx", "model.onnx"],
    min_size: 100_000_000,
    resolution: (1024, 1024),
};

pub struct CutoutEngine;

impl CutoutEngine {
    pub fn get_spec(model_id: Option<&str>) -> &'static ModelSpec {
        match model_id.unwrap_or("rmbg-2.0").trim().to_lowercase().as_str() {
            "lucida-onnx" | "lucida" => &LUCIDA_SPEC,
            "birefnet-hr" | "birefnet-hr-matting" | "birefnet-hr-matting-onnx" => &BIREFNET_HR_SPEC,
            "fey-nobg" | "feynobg" | "fey-nobg-onnx" => &FEY_NOBG_SPEC,
            "birefnet-onnx" | "birefnet" => &LUCIDA_SPEC,
            _ => &RMBG_SPEC,
        }
    }

    pub fn get_models_dir() -> Result<PathBuf, String> {
        let dir = if let Some(proj_dirs) = ProjectDirs::from("dev", "pinkpixel", "snap") {
            proj_dirs.data_local_dir().to_path_buf()
        } else {
            let home = std::env::var("HOME").map_err(|e| format!("HOME not set: {}", e))?;
            Path::new(&home).join(".local").join("share").join("snap")
        };

        let models_dir = dir.join("models");
        fs::create_dir_all(&models_dir).map_err(|e| format!("Failed to create models dir: {}", e))?;

        Ok(models_dir)
    }

    pub fn get_model_path(model_id: Option<&str>) -> Result<PathBuf, String> {
        let models_dir = Self::get_models_dir()?;
        let spec = Self::get_spec(model_id);

        for name in spec.candidates {
            let p = models_dir.join(name);
            if p.exists() {
                if let Ok(meta) = fs::metadata(&p) {
                    if meta.len() > spec.min_size {
                        return Ok(p);
                    }
                }
            }
        }

        Ok(models_dir.join(spec.filename))
    }

    pub fn is_model_ready(model_id: Option<&str>) -> bool {
        let spec = Self::get_spec(model_id);
        if let Ok(path) = Self::get_model_path(model_id) {
            if path.exists() {
                if let Ok(meta) = fs::metadata(&path) {
                    return meta.len() > spec.min_size;
                }
            }
        }
        false
    }

    fn resolve_token(passed_token: Option<&str>) -> Option<String> {
        if let Some(t) = passed_token {
            let trimmed = t.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
        if let Ok(t) = std::env::var("HF_TOKEN") {
            let trimmed = t.trim().to_string();
            if !trimmed.is_empty() {
                return Some(trimmed);
            }
        }
        if let Ok(t) = std::env::var("HUGGING_FACE_HUB_TOKEN") {
            let trimmed = t.trim().to_string();
            if !trimmed.is_empty() {
                return Some(trimmed);
            }
        }
        if let Ok(home) = std::env::var("HOME") {
            let token_path = Path::new(&home).join(".cache").join("huggingface").join("token");
            if let Ok(content) = fs::read_to_string(token_path) {
                let trimmed = content.trim().to_string();
                if !trimmed.is_empty() {
                    return Some(trimmed);
                }
            }
        }
        None
    }

    fn download_stream(url: &str, target_path: &Path, token: Option<&str>) -> Result<(), String> {
        let temp_path = target_path.with_extension("tmp");
        let mut req = ureq::get(url);
        if let Some(tok) = token {
            req = req.header("Authorization", &format!("Bearer {}", tok));
        }

        let response = req.call().map_err(|e| format!("Download network error: {}", e))?;
        let status = response.status();
        if status.as_u16() == 401 {
            return Err(format!(
                "Hugging Face authentication required (HTTP 401). Access to {} is gated. Please configure your Hugging Face Token in Settings.",
                url
            ));
        } else if !status.is_success() {
            return Err(format!("Download failed with HTTP {} from {}", status.as_u16(), url));
        }

        let mut body_reader = response.into_body().into_reader();
        let mut file = File::create(&temp_path).map_err(|e| format!("Failed to create temp model file: {}", e))?;

        let mut buffer = [0u8; 262144]; // 256 KB buffer for high-throughput download
        loop {
            use std::io::Read;
            let bytes_read = body_reader
                .read(&mut buffer)
                .map_err(|e| format!("Download stream read error: {}", e))?;
            if bytes_read == 0 {
                break;
            }
            file.write_all(&buffer[..bytes_read])
                .map_err(|e| format!("Write error: {}", e))?;
        }

        file.flush().map_err(|e| format!("Flush error: {}", e))?;
        drop(file);

        fs::rename(&temp_path, target_path)
            .map_err(|e| format!("Failed to finalize model file: {}", e))?;

        Ok(())
    }

    pub fn ensure_model(model_id: Option<&str>, hf_token: Option<&str>) -> Result<PathBuf, String> {
        let spec = Self::get_spec(model_id);
        let target_path = Self::get_model_path(model_id)?;

        if target_path.exists() {
            if let Ok(meta) = fs::metadata(&target_path) {
                if meta.len() > spec.min_size {
                    return Ok(target_path);
                }
            }
        }

        let token = Self::resolve_token(hf_token);

        // Attempt download from primary URL
        let primary_result = Self::download_stream(spec.primary_url, &target_path, token.as_deref());
        if primary_result.is_ok() {
            return Ok(target_path);
        }

        // If primary download failed and a fallback mirror is specified, attempt fallback
        if let Some(fallback_url) = spec.fallback_url {
            let fallback_result = Self::download_stream(fallback_url, &target_path, token.as_deref());
            if fallback_result.is_ok() {
                return Ok(target_path);
            }
        }

        primary_result.map(|_| target_path)
    }

    pub fn remove_background(
        img: &DynamicImage,
        model_id: Option<&str>,
        hf_token: Option<&str>,
    ) -> Result<DynamicImage, String> {
        let spec = Self::get_spec(model_id);
        let model_path = Self::ensure_model(model_id, hf_token)?;

        // 1. Initialize ONNX runtime and session with GPU (CUDA) and CPU fallback
        let mut session = Session::builder()
            .map_err(|e| format!("Failed to create session builder: {}", e))?
            .with_execution_providers([
                ort::ep::CUDA::default().build(),
                ort::ep::CPU::default().build(),
            ])
            .map_err(|e| format!("Failed to configure execution providers: {}", e))?
            .with_intra_threads(4)
            .map_err(|e| format!("Failed to configure intra threads: {}", e))?
            .with_inter_threads(1)
            .map_err(|e| format!("Failed to configure inter threads: {}", e))?
            .commit_from_file(&model_path)
            .map_err(|e| format!("Failed to load ONNX model: {}", e))?;

        let (orig_w, orig_h) = img.dimensions();
        let (target_w, target_h) = spec.resolution;

        // 2. Preprocess: Resize to model native resolution and normalize with ImageNet mean & std
        let resized = img.resize_exact(target_w, target_h, image::imageops::FilterType::Triangle);
        let rgb_img = resized.to_rgb8();

        let mut input_array = Array4::<f32>::zeros((1, 3, target_h as usize, target_w as usize));

        let mean = [0.485f32, 0.456f32, 0.406f32];
        let std = [0.229f32, 0.224f32, 0.225f32];

        for y in 0..target_h {
            for x in 0..target_w {
                let pixel = rgb_img.get_pixel(x, y);
                input_array[[0, 0, y as usize, x as usize]] = ((pixel[0] as f32 / 255.0) - mean[0]) / std[0];
                input_array[[0, 1, y as usize, x as usize]] = ((pixel[1] as f32 / 255.0) - mean[1]) / std[1];
                input_array[[0, 2, y as usize, x as usize]] = ((pixel[2] as f32 / 255.0) - mean[2]) / std[2];
            }
        }

        // 3. Run Inference
        let input_tensor = ort::value::Tensor::from_array(input_array)
            .map_err(|e| format!("Failed to create tensor: {}", e))?;

        let outputs = session
            .run(ort::inputs![input_tensor])
            .map_err(|e| format!("Inference execution failed: {}", e))?;

        // 4. Extract output probability mask
        let (_, output_tensor) = outputs
            .into_iter()
            .next()
            .ok_or_else(|| "No output tensor returned".to_string())?;

        let mask_data = output_tensor
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("Failed to extract output tensor: {}", e))?;

        let (_, data_slice) = mask_data;

        // Check if output is raw logits or sigmoid probability [0.0, 1.0]
        let total_pixels = (target_w * target_h) as usize;
        let mut min_val = f32::INFINITY;
        let mut max_val = f32::NEG_INFINITY;
        for &val in data_slice.iter().take(total_pixels) {
            if val < min_val { min_val = val; }
            if val > max_val { max_val = val; }
        }

        let is_logits = max_val > 1.05 || min_val < -0.05;
        let range = (max_val - min_val).max(1e-6);

        let mut mask = GrayImage::new(target_w, target_h);
        for y in 0..target_h {
            for x in 0..target_w {
                let idx = (y * target_w + x) as usize;
                let val = data_slice.get(idx).copied().unwrap_or(0.0);
                let norm = if is_logits {
                    ((val - min_val) / range).clamp(0.0, 1.0)
                } else {
                    val.clamp(0.0, 1.0)
                };
                let byte_val = (norm * 255.0).round() as u8;
                mask.put_pixel(x, y, Luma([byte_val]));
            }
        }

        // 5. Upscale mask to original dimensions (Triangle/Bilinear is fast and smooth)
        let full_mask = image::imageops::resize(
            &mask,
            orig_w,
            orig_h,
            image::imageops::FilterType::Triangle,
        );

        // 6. Apply mask directly to raw alpha channel in place
        let mut orig_rgba = img.to_rgba8();
        let mask_raw = full_mask.as_raw();
        let orig_raw: &mut [u8] = orig_rgba.as_mut();

        let num_pixels = (orig_w * orig_h) as usize;
        let limit = num_pixels.min(mask_raw.len()).min(orig_raw.len() / 4);
        for i in 0..limit {
            let mask_alpha = mask_raw[i] as u32;
            let current_alpha = orig_raw[i * 4 + 3] as u32;
            orig_raw[i * 4 + 3] = ((current_alpha * mask_alpha + 127) / 255) as u8;
        }

        Ok(DynamicImage::ImageRgba8(orig_rgba))
    }
}
