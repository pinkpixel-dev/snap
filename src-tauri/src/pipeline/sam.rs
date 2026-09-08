use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use directories::ProjectDirs;
use image::{DynamicImage, GenericImageView, GrayImage, Luma, RgbaImage};
use ndarray::{Array3, Array4};
use ort::session::Session;
use crate::models::{CropSettings, PromptPoint, SamEffectSettings, SamMaskResult};
use super::Pipeline;

pub const ENCODER_FILENAME: &str = "slimsam-encoder-quantized.onnx";
pub const DECODER_FILENAME: &str = "slimsam-decoder-quantized.onnx";

pub const ENCODER_URL: &str = "https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/vision_encoder_quantized.onnx";
pub const DECODER_URL: &str = "https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx/prompt_encoder_mask_decoder_quantized.onnx";

pub const ENCODER_MIN_SIZE: u64 = 5_000_000; // ~8.8 MB
pub const DECODER_MIN_SIZE: u64 = 3_000_000; // ~4.9 MB

#[derive(Clone)]
pub struct SamCachedState {
    pub embeddings: Array4<f32>, // shape [1, 256, 64, 64]
    pub positional_embeddings: Array4<f32>, // shape [1, 256, 64, 64]
    pub orig_w: u32,
    pub orig_h: u32,
    pub resized_w: u32,
    pub resized_h: u32,
    pub source_key: String,
    pub last_mask: Option<GrayImage>,
}

pub type SharedSamState = Arc<Mutex<Option<SamCachedState>>>;

pub struct SamEngine;

impl SamEngine {
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

    pub fn get_encoder_path() -> Result<PathBuf, String> {
        let models_dir = Self::get_models_dir()?;
        let candidates = [
            ENCODER_FILENAME,
            "slimsam-encoder.onnx",
            "vision_encoder_quantized.onnx",
        ];
        for name in candidates {
            let p = models_dir.join(name);
            if p.exists() {
                if let Ok(meta) = fs::metadata(&p) {
                    if meta.len() > ENCODER_MIN_SIZE {
                        return Ok(p);
                    }
                }
            }
        }
        Ok(models_dir.join(ENCODER_FILENAME))
    }

    pub fn get_decoder_path() -> Result<PathBuf, String> {
        let models_dir = Self::get_models_dir()?;
        let candidates = [
            DECODER_FILENAME,
            "slimsam-decoder.onnx",
            "prompt_encoder_mask_decoder_quantized.onnx",
        ];
        for name in candidates {
            let p = models_dir.join(name);
            if p.exists() {
                if let Ok(meta) = fs::metadata(&p) {
                    if meta.len() > DECODER_MIN_SIZE {
                        return Ok(p);
                    }
                }
            }
        }
        Ok(models_dir.join(DECODER_FILENAME))
    }

    pub fn is_model_ready() -> bool {
        if let (Ok(enc), Ok(dec)) = (Self::get_encoder_path(), Self::get_decoder_path()) {
            if enc.exists() && dec.exists() {
                let enc_ok = fs::metadata(&enc).map(|m| m.len() > ENCODER_MIN_SIZE).unwrap_or(false);
                let dec_ok = fs::metadata(&dec).map(|m| m.len() > DECODER_MIN_SIZE).unwrap_or(false);
                return enc_ok && dec_ok;
            }
        }
        false
    }

    fn download_file(url: &str, target_path: &Path, min_size: u64) -> Result<(), String> {
        let temp_path = target_path.with_extension("tmp");
        if temp_path.exists() {
            let _ = fs::remove_file(&temp_path);
        }

        let agent = ureq::Agent::config_builder()
            .timeout_global(Some(std::time::Duration::from_secs(300)))
            .build()
            .new_agent();

        let req = agent.get(url);
        let resp = req.call().map_err(|e| format!("Download request failed: {}", e))?;

        if resp.status().as_u16() >= 400 {
            return Err(format!("Download failed with HTTP status {}", resp.status()));
        }

        let mut reader = resp.into_body().into_reader();
        let mut file = File::create(&temp_path).map_err(|e| format!("Failed to create temp file: {}", e))?;

        let mut buffer = [0u8; 65536];
        let mut downloaded: u64 = 0;

        loop {
            let bytes_read = reader.read(&mut buffer).map_err(|e| format!("Download stream read error: {}", e))?;
            if bytes_read == 0 {
                break;
            }
            file.write_all(&buffer[..bytes_read])
                .map_err(|e| format!("Failed to write downloaded bytes: {}", e))?;
            downloaded += bytes_read as u64;
        }

        file.flush().map_err(|e| format!("Failed to flush temp file: {}", e))?;
        drop(file);

        if downloaded < min_size {
            let _ = fs::remove_file(&temp_path);
            return Err(format!("Downloaded file is too small ({} bytes)", downloaded));
        }

        fs::rename(&temp_path, target_path).map_err(|e| format!("Failed to commit model file: {}", e))?;
        Ok(())
    }

    pub fn download_models() -> Result<(), String> {
        let enc_path = Self::get_encoder_path()?;
        let dec_path = Self::get_decoder_path()?;

        if !enc_path.exists() || fs::metadata(&enc_path).map(|m| m.len() < ENCODER_MIN_SIZE).unwrap_or(true) {
            Self::download_file(ENCODER_URL, &enc_path, ENCODER_MIN_SIZE)?;
        }

        if !dec_path.exists() || fs::metadata(&dec_path).map(|m| m.len() < DECODER_MIN_SIZE).unwrap_or(true) {
            Self::download_file(DECODER_URL, &dec_path, DECODER_MIN_SIZE)?;
        }

        Ok(())
    }

    fn create_session(model_path: &Path) -> Result<Session, String> {
        let use_cuda = Pipeline::is_cuda_available();
        let mut builder = Session::builder()
            .map_err(|e| format!("Failed to create session builder: {}", e))?;

        if use_cuda {
            builder = builder
                .with_execution_providers([
                    ort::ep::CUDA::default().build(),
                    ort::ep::CPU::default().build(),
                ])
                .map_err(|e| format!("Failed to configure execution providers: {}", e))?;
        } else {
            builder = builder
                .with_execution_providers([
                    ort::ep::CPU::default().build(),
                ])
                .map_err(|e| format!("Failed to configure CPU execution provider: {}", e))?;
        }

        builder
            .with_intra_threads(4)
            .map_err(|e| format!("Failed to configure intra threads: {}", e))?
            .with_inter_threads(1)
            .map_err(|e| format!("Failed to configure inter threads: {}", e))?
            .commit_from_file(model_path)
            .map_err(|e| format!("Failed to load ONNX model {:?}: {}", model_path, e))
    }

    pub fn encode_image(img: &DynamicImage, source_key: &str) -> Result<SamCachedState, String> {
        let encoder_path = Self::get_encoder_path()?;
        if !encoder_path.exists() {
            Self::download_models()?;
        }

        let mut session = Self::create_session(&encoder_path)?;

        let (orig_w, orig_h) = img.dimensions();

        // 1. Calculate resized dimensions maintaining aspect ratio (longest edge = 1024)
        let (resized_w, resized_h) = if orig_w >= orig_h {
            let scale = 1024.0 / orig_w as f32;
            let rh = ((orig_h as f32 * scale).round() as u32).max(1).min(1024);
            (1024, rh)
        } else {
            let scale = 1024.0 / orig_h as f32;
            let rw = ((orig_w as f32 * scale).round() as u32).max(1).min(1024);
            (rw, 1024)
        };

        // 2. Resize and pad into 1024x1024 input tensor
        let resized = img.resize_exact(resized_w, resized_h, image::imageops::FilterType::Triangle);
        let rgb_img = resized.to_rgb8();

        let mut input_array = Array4::<f32>::zeros((1, 3, 1024, 1024));
        let mean = [0.485f32, 0.456f32, 0.406f32];
        let std = [0.229f32, 0.224f32, 0.225f32];

        for y in 0..resized_h {
            for x in 0..resized_w {
                let pixel = rgb_img.get_pixel(x, y);
                input_array[[0, 0, y as usize, x as usize]] = ((pixel[0] as f32 / 255.0) - mean[0]) / std[0];
                input_array[[0, 1, y as usize, x as usize]] = ((pixel[1] as f32 / 255.0) - mean[1]) / std[1];
                input_array[[0, 2, y as usize, x as usize]] = ((pixel[2] as f32 / 255.0) - mean[2]) / std[2];
            }
        }

        // 3. Run Vision Encoder session
        let input_tensor = ort::value::Tensor::from_array(input_array)
            .map_err(|e| format!("Failed to create input tensor: {}", e))?;

        let outputs = session
            .run(ort::inputs!["pixel_values" => input_tensor])
            .map_err(|e| format!("Encoder inference failed: {}", e))?;

        let mut emb_opt: Option<(Vec<usize>, Vec<f32>)> = None;
        let mut pos_opt: Option<(Vec<usize>, Vec<f32>)> = None;

        for (name, val) in outputs {
            if name == "image_embeddings" {
                if let Ok((shape, slice)) = val.try_extract_tensor::<f32>() {
                    emb_opt = Some((shape.iter().map(|&x| x as usize).collect(), slice.to_vec()));
                }
            } else if name == "image_positional_embeddings" {
                if let Ok((shape, slice)) = val.try_extract_tensor::<f32>() {
                    pos_opt = Some((shape.iter().map(|&x| x as usize).collect(), slice.to_vec()));
                }
            }
        }

        let (emb_shape, emb_slice) = emb_opt.ok_or_else(|| "Missing image_embeddings output".to_string())?;
        let (pos_shape, pos_slice) = pos_opt.ok_or_else(|| "Missing image_positional_embeddings output".to_string())?;

        let embeddings = Array4::from_shape_vec(
            (emb_shape[0], emb_shape[1], emb_shape[2], emb_shape[3]),
            emb_slice,
        ).map_err(|e| format!("Embedding shape error: {}", e))?;

        let positional_embeddings = Array4::from_shape_vec(
            (pos_shape[0], pos_shape[1], pos_shape[2], pos_shape[3]),
            pos_slice,
        ).map_err(|e| format!("Positional embedding shape error: {}", e))?;

        Ok(SamCachedState {
            embeddings,
            positional_embeddings,
            orig_w,
            orig_h,
            resized_w,
            resized_h,
            source_key: source_key.to_string(),
            last_mask: None,
        })
    }

    pub fn decode_mask(
        cached: &mut SamCachedState,
        points: &[PromptPoint],
    ) -> Result<SamMaskResult, String> {
        if points.is_empty() {
            cached.last_mask = None;
            return Ok(SamMaskResult {
                mask_data_url: "".to_string(),
                score: 0.0,
                bounds: None,
            });
        }

        let decoder_path = Self::get_decoder_path()?;
        if !decoder_path.exists() {
            Self::download_models()?;
        }

        let mut session = Self::create_session(&decoder_path)?;

        let num_points = points.len();

        // 1. Build input_points tensor: [1, 1, N, 2] in 1024x1024 space
        let mut points_array = Array4::<f32>::zeros((1, 1, num_points, 2));
        // 2. Build input_labels tensor: [1, 1, N] of i64
        let mut labels_array = Array3::<i64>::zeros((1, 1, num_points));

        for (i, p) in points.iter().enumerate() {
            let px = p.x.clamp(0.0, 1.0) * cached.resized_w as f32;
            let py = p.y.clamp(0.0, 1.0) * cached.resized_h as f32;
            points_array[[0, 0, i, 0]] = px;
            points_array[[0, 0, i, 1]] = py;
            labels_array[[0, 0, i]] = if p.label > 0 { 1 } else { 0 };
        }

        let emb_tensor = ort::value::Tensor::from_array(cached.embeddings.clone())
            .map_err(|e| format!("Failed to create embeddings tensor: {}", e))?;
        let pos_tensor = ort::value::Tensor::from_array(cached.positional_embeddings.clone())
            .map_err(|e| format!("Failed to create positional embeddings tensor: {}", e))?;
        let pts_tensor = ort::value::Tensor::from_array(points_array)
            .map_err(|e| format!("Failed to create points tensor: {}", e))?;
        let lbl_tensor = ort::value::Tensor::from_array(labels_array)
            .map_err(|e| format!("Failed to create labels tensor: {}", e))?;

        // 3. Run Mask Decoder session
        let outputs = session
            .run(ort::inputs![
                "image_embeddings" => emb_tensor,
                "image_positional_embeddings" => pos_tensor,
                "input_points" => pts_tensor,
                "input_labels" => lbl_tensor
            ])
            .map_err(|e| format!("Decoder inference failed: {}", e))?;

        // Extract iou_scores and pred_masks
        let mut scores_opt: Option<Vec<f32>> = None;
        let mut masks_opt: Option<(Vec<usize>, Vec<f32>)> = None;

        for (name, val) in outputs {
            if name == "iou_scores" {
                if let Ok((_shape, slice)) = val.try_extract_tensor::<f32>() {
                    scores_opt = Some(slice.to_vec());
                }
            } else if name == "pred_masks" {
                if let Ok((shape, slice)) = val.try_extract_tensor::<f32>() {
                    masks_opt = Some((shape.iter().map(|&x| x as usize).collect(), slice.to_vec()));
                }
            }
        }

        let (mask_shape, mask_slice) = masks_opt.ok_or_else(|| "Missing pred_masks output".to_string())?;
        let scores = scores_opt.unwrap_or_else(|| vec![1.0, 0.0, 0.0]);

        // Find best mask index (highest IoU score among candidate masks)
        let num_masks = if mask_shape.len() == 5 { mask_shape[2] } else { 3 };
        let mut best_idx = 0;
        let mut best_score = f32::NEG_INFINITY;
        for (i, &sc) in scores.iter().take(num_masks).enumerate() {
            if sc > best_score {
                best_score = sc;
                best_idx = i;
            }
        }
        if best_score == f32::NEG_INFINITY {
            best_score = 0.95;
            best_idx = 0;
        }

        // The 256x256 logits represent the 1024x1024 canvas.
        // The unpadded valid subregion has dimensions (valid_w, valid_h):
        let valid_w = ((256.0 * cached.resized_w as f32) / 1024.0).round().max(1.0).min(256.0) as u32;
        let valid_h = ((256.0 * cached.resized_h as f32) / 1024.0).round().max(1.0).min(256.0) as u32;

        let mask_stride = 256 * 256;
        let best_mask_offset = best_idx * mask_stride;

        // Build valid sub-mask with sigmoid probabilities
        let mut sub_mask = GrayImage::new(valid_w, valid_h);
        for y in 0..valid_h {
            for x in 0..valid_w {
                let idx = best_mask_offset + (y as usize * 256 + x as usize);
                let logit = mask_slice.get(idx).copied().unwrap_or(0.0);
                // Sigmoid for clean anti-aliasing
                let prob = 1.0 / (1.0 + (-logit).exp());
                let byte_val = (prob.clamp(0.0, 1.0) * 255.0).round() as u8;
                sub_mask.put_pixel(x, y, Luma([byte_val]));
            }
        }

        // Resize sub_mask back to original image dimensions
        let full_mask = image::imageops::resize(
            &sub_mask,
            cached.orig_w,
            cached.orig_h,
            image::imageops::FilterType::Triangle,
        );

        // Compute bounding box around foreground (pixels > 128)
        let mut min_x = u32::MAX;
        let mut min_y = u32::MAX;
        let mut max_x = 0;
        let mut max_y = 0;
        let mut has_fg = false;

        for y in 0..cached.orig_h {
            for x in 0..cached.orig_w {
                if full_mask.get_pixel(x, y)[0] > 128 {
                    has_fg = true;
                    if x < min_x { min_x = x; }
                    if y < min_y { min_y = y; }
                    if x > max_x { max_x = x; }
                    if y > max_y { max_y = y; }
                }
            }
        }

        let bounds = if has_fg {
            let bw = max_x.saturating_sub(min_x) + 1;
            let bh = max_y.saturating_sub(min_y) + 1;
            Some(CropSettings {
                x: min_x,
                y: min_y,
                width: bw,
                height: bh,
            })
        } else {
            None
        };

        // Cache the last mask for effect operations
        cached.last_mask = Some(full_mask.clone());

        // Create colored overlay for preview (cyan highlight: rgba(34, 211, 238, 160))
        let preview_max_dim = 1024u32;
        let (prev_w, prev_h) = if cached.orig_w > preview_max_dim || cached.orig_h > preview_max_dim {
            if cached.orig_w >= cached.orig_h {
                let sc = preview_max_dim as f32 / cached.orig_w as f32;
                (preview_max_dim, ((cached.orig_h as f32 * sc).round() as u32).max(1))
            } else {
                let sc = preview_max_dim as f32 / cached.orig_h as f32;
                (((cached.orig_w as f32 * sc).round() as u32).max(1), preview_max_dim)
            }
        } else {
            (cached.orig_w, cached.orig_h)
        };

        let preview_mask = image::imageops::resize(
            &full_mask,
            prev_w,
            prev_h,
            image::imageops::FilterType::Triangle,
        );

        let mut overlay = RgbaImage::new(prev_w, prev_h);
        for y in 0..prev_h {
            for x in 0..prev_w {
                let m = preview_mask.get_pixel(x, y)[0];
                if m > 20 {
                    let alpha = ((m as f32 / 255.0) * 160.0).round() as u8;
                    overlay.put_pixel(x, y, image::Rgba([34, 211, 238, alpha]));
                }
            }
        }

        let (bytes, _) = Pipeline::encode_to_bytes(
            &DynamicImage::ImageRgba8(overlay),
            "png",
            None,
            None,
        )?;
        let mask_data_url = format!("data:image/png;base64,{}", base64::Engine::encode(&base64::engine::general_purpose::STANDARD, bytes));

        Ok(SamMaskResult {
            mask_data_url,
            score: best_score,
            bounds,
        })
    }

    pub fn apply_effect(
        img: &DynamicImage,
        mask: &GrayImage,
        settings: &SamEffectSettings,
    ) -> Result<DynamicImage, String> {
        let (w, h) = img.dimensions();
        let (mw, mh) = mask.dimensions();
        let working_mask = if mw != w || mh != h {
            image::imageops::resize(mask, w, h, image::imageops::FilterType::Triangle)
        } else {
            mask.clone()
        };

        let invert = settings.invert.unwrap_or(false);

        match settings.effect.to_lowercase().as_str() {
            "cutout" => {
                let mut rgba = img.to_rgba8();
                for y in 0..h {
                    for x in 0..w {
                        let m = working_mask.get_pixel(x, y)[0];
                        let alpha_weight = if invert { 255 - m } else { m };
                        let px = rgba.get_pixel_mut(x, y);
                        let orig_a = px[3] as u32;
                        px[3] = ((orig_a * alpha_weight as u32 + 127) / 255) as u8;
                    }
                }
                Ok(DynamicImage::ImageRgba8(rgba))
            }
            "blur" => {
                let radius = settings.blur_radius.unwrap_or(15.0).max(1.0).min(50.0);
                let blurred = image::imageops::blur(img, radius);
                let mut orig_rgba = img.to_rgba8();
                let blurred_rgba = blurred;

                for y in 0..h {
                    for x in 0..w {
                        let m = working_mask.get_pixel(x, y)[0];
                        // If not inverted, mask=255 is subject (sharp), mask=0 is background (blur)
                        let subject_weight = if invert { (255 - m) as f32 / 255.0 } else { m as f32 / 255.0 };
                        let bg_weight = 1.0 - subject_weight;

                        let o_px = orig_rgba.get_pixel_mut(x, y);
                        let b_px = blurred_rgba.get_pixel(x, y);

                        o_px[0] = ((o_px[0] as f32 * subject_weight) + (b_px[0] as f32 * bg_weight)).round() as u8;
                        o_px[1] = ((o_px[1] as f32 * subject_weight) + (b_px[1] as f32 * bg_weight)).round() as u8;
                        o_px[2] = ((o_px[2] as f32 * subject_weight) + (b_px[2] as f32 * bg_weight)).round() as u8;
                    }
                }
                Ok(DynamicImage::ImageRgba8(orig_rgba))
            }
            "color_splash" => {
                let mut rgba = img.to_rgba8();
                for y in 0..h {
                    for x in 0..w {
                        let m = working_mask.get_pixel(x, y)[0];
                        let subject_weight = if invert { (255 - m) as f32 / 255.0 } else { m as f32 / 255.0 };
                        let bg_weight = 1.0 - subject_weight;

                        let px = rgba.get_pixel_mut(x, y);
                        let gray = (0.299 * px[0] as f32 + 0.587 * px[1] as f32 + 0.114 * px[2] as f32).round();

                        px[0] = ((px[0] as f32 * subject_weight) + (gray * bg_weight)).round() as u8;
                        px[1] = ((px[1] as f32 * subject_weight) + (gray * bg_weight)).round() as u8;
                        px[2] = ((px[2] as f32 * subject_weight) + (gray * bg_weight)).round() as u8;
                    }
                }
                Ok(DynamicImage::ImageRgba8(rgba))
            }
            "adjustments" => {
                let mut rgba = img.to_rgba8();
                let is_subject_target = settings.target.as_deref().unwrap_or("background") == "subject";

                let bright = settings.brightness.unwrap_or(0.0).clamp(-1.0, 1.0) * 255.0;
                let cont = settings.contrast.unwrap_or(0.0).clamp(-1.0, 1.0);
                let sat = settings.saturation.unwrap_or(0.0).clamp(-1.0, 1.0);

                let cont_factor = if cont >= 0.0 {
                    1.0 + cont * 2.0
                } else {
                    1.0 + cont
                };

                for y in 0..h {
                    for x in 0..w {
                        let m = working_mask.get_pixel(x, y)[0];
                        let mut weight = m as f32 / 255.0;
                        if invert {
                            weight = 1.0 - weight;
                        }
                        // Target selection: apply either to subject or background
                        let effect_weight = if is_subject_target { weight } else { 1.0 - weight };

                        if effect_weight <= 0.001 {
                            continue;
                        }

                        let px = rgba.get_pixel_mut(x, y);
                        let mut r = px[0] as f32;
                        let mut g = px[1] as f32;
                        let mut b = px[2] as f32;

                        // Brightness
                        r += bright;
                        g += bright;
                        b += bright;

                        // Contrast
                        r = (r - 128.0) * cont_factor + 128.0;
                        g = (g - 128.0) * cont_factor + 128.0;
                        b = (b - 128.0) * cont_factor + 128.0;

                        // Saturation
                        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
                        let sat_factor = 1.0 + sat;
                        r = gray + (r - gray) * sat_factor;
                        g = gray + (g - gray) * sat_factor;
                        b = gray + (b - gray) * sat_factor;

                        // Blend with original pixel according to effect_weight
                        let orig_r = px[0] as f32;
                        let orig_g = px[1] as f32;
                        let orig_b = px[2] as f32;

                        px[0] = (orig_r * (1.0 - effect_weight) + r.clamp(0.0, 255.0) * effect_weight).round() as u8;
                        px[1] = (orig_g * (1.0 - effect_weight) + g.clamp(0.0, 255.0) * effect_weight).round() as u8;
                        px[2] = (orig_b * (1.0 - effect_weight) + b.clamp(0.0, 255.0) * effect_weight).round() as u8;
                    }
                }
                Ok(DynamicImage::ImageRgba8(rgba))
            }
            other => Err(format!("Unsupported effect '{}'", other)),
        }
    }
}
