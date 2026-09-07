use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use directories::ProjectDirs;
use image::{DynamicImage, GenericImageView, GrayImage, ImageBuffer, Luma, Rgba, RgbaImage};
use ndarray::Array4;
use ort::session::Session;

pub struct ModelSpec {
    pub id: &'static str,
    pub filename: &'static str,
    pub primary_url: &'static str,
    pub fallback_url: Option<&'static str>,
    pub candidates: &'static [&'static str],
    pub min_size: u64,
}

pub const REAL_ESRGAN_X4PLUS_SPEC: ModelSpec = ModelSpec {
    id: "realesrgan-x4plus",
    filename: "RealESRGAN_x4plus.onnx",
    primary_url: "https://huggingface.co/mhmtaufiq/realesrgan-onnx/resolve/main/RealESRGAN_x4plus.onnx",
    fallback_url: Some("https://huggingface.co/universonic/RealESRGAN/resolve/main/RealESRGAN_x4plus_fp32.onnx"),
    candidates: &["RealESRGAN_x4plus.onnx", "realesrgan-x4plus.onnx", "RealESRGAN_x4plus_fp32.onnx"],
    min_size: 50_000_000,
};

pub const REAL_ESRGAN_X4PLUS_ANIME_SPEC: ModelSpec = ModelSpec {
    id: "realesrgan-x4plus-anime",
    filename: "RealESRGAN_x4plus_anime_6B.onnx",
    primary_url: "https://huggingface.co/mhmtaufiq/realesrgan-onnx/resolve/main/RealESRGAN_x4plus_anime_6B.onnx",
    fallback_url: Some("https://huggingface.co/universonic/RealESRGAN/resolve/main/RealESRGAN_x4plus_anime_6B_fp32.onnx"),
    candidates: &["RealESRGAN_x4plus_anime_6B.onnx", "realesrgan-x4plus-anime.onnx", "RealESRGAN_x4plus_anime_6B_fp32.onnx"],
    min_size: 15_000_000,
};

pub struct UpscaleEngine;

impl UpscaleEngine {
    pub fn get_spec(model_id: Option<&str>) -> &'static ModelSpec {
        match model_id.unwrap_or("realesrgan-x4plus").trim().to_lowercase().as_str() {
            "realesrgan-x4plus-anime" | "anime" | "realesrgan_x4plus_anime_6b" => {
                &REAL_ESRGAN_X4PLUS_ANIME_SPEC
            }
            _ => &REAL_ESRGAN_X4PLUS_SPEC,
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

    fn download_stream(url: &str, target_path: &Path) -> Result<(), String> {
        let temp_path = target_path.with_extension("tmp");
        let req = ureq::get(url);

        let response = req.call().map_err(|e| format!("Download network error: {}", e))?;
        let status = response.status();
        if !status.is_success() {
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

    pub fn ensure_model(model_id: Option<&str>) -> Result<PathBuf, String> {
        let spec = Self::get_spec(model_id);
        let target_path = Self::get_model_path(model_id)?;

        if target_path.exists() {
            if let Ok(meta) = fs::metadata(&target_path) {
                if meta.len() > spec.min_size {
                    return Ok(target_path);
                }
            }
        }

        // Attempt download from primary URL
        let primary_result = Self::download_stream(spec.primary_url, &target_path);
        if primary_result.is_ok() {
            return Ok(target_path);
        }

        // If primary download failed and a fallback mirror is specified, attempt fallback
        if let Some(fallback_url) = spec.fallback_url {
            let fallback_result = Self::download_stream(fallback_url, &target_path);
            if fallback_result.is_ok() {
                return Ok(target_path);
            }
        }

        primary_result.map(|_| target_path)
    }

    fn run_tile_inference(
        session: &mut Session,
        tile_rgb: &image::RgbImage,
    ) -> Result<image::RgbImage, String> {
        let (tile_w, tile_h) = tile_rgb.dimensions();
        let mut input_array = Array4::<f32>::zeros((1, 3, tile_h as usize, tile_w as usize));

        for y in 0..tile_h {
            for x in 0..tile_w {
                let pixel = tile_rgb.get_pixel(x, y);
                input_array[[0, 0, y as usize, x as usize]] = pixel[0] as f32 / 255.0;
                input_array[[0, 1, y as usize, x as usize]] = pixel[1] as f32 / 255.0;
                input_array[[0, 2, y as usize, x as usize]] = pixel[2] as f32 / 255.0;
            }
        }

        let input_tensor = ort::value::Tensor::from_array(input_array)
            .map_err(|e| format!("Failed to create input tensor: {}", e))?;

        let outputs = session
            .run(ort::inputs![input_tensor])
            .map_err(|e| format!("Upscale inference failed: {}", e))?;

        let (_, output_tensor) = outputs
            .into_iter()
            .next()
            .ok_or_else(|| "No output tensor returned".to_string())?;

        let tensor_data = output_tensor
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("Failed to extract output tensor: {}", e))?;

        let (shape, data_slice) = tensor_data;
        // Shape is [1, 3, out_h, out_w]
        let out_h = shape[2] as u32;
        let out_w = shape[3] as u32;

        let mut out_img = image::RgbImage::new(out_w, out_h);
        let channel_stride = (out_w * out_h) as usize;

        for y in 0..out_h {
            for x in 0..out_w {
                let idx = (y * out_w + x) as usize;
                let r = (data_slice.get(idx).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                let g = (data_slice.get(idx + channel_stride).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                let b = (data_slice.get(idx + channel_stride * 2).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                out_img.put_pixel(x, y, image::Rgb([r, g, b]));
            }
        }

        Ok(out_img)
    }

    pub fn upscale(
        img: &DynamicImage,
        model_id: Option<&str>,
        target_scale: u32,
    ) -> Result<DynamicImage, String> {
        let model_path = Self::ensure_model(model_id)?;

        let mut session = Session::builder()
            .map_err(|e| format!("Failed to create session builder: {}", e))?
            .with_intra_threads(4)
            .map_err(|e| format!("Failed to configure intra threads: {}", e))?
            .with_inter_threads(1)
            .map_err(|e| format!("Failed to configure inter threads: {}", e))?
            .commit_from_file(&model_path)
            .map_err(|e| format!("Failed to load ONNX upscale model: {}", e))?;

        let (orig_w, orig_h) = img.dimensions();
        if orig_w == 0 || orig_h == 0 {
            return Err("Cannot upscale empty image".to_string());
        }

        let has_alpha = img.color().has_alpha();
        let rgb_img = img.to_rgb8();

        let target_4x_w = orig_w * 4;
        let target_4x_h = orig_h * 4;
        let mut final_rgb = image::RgbImage::new(target_4x_w, target_4x_h);

        // Tile configuration to bound memory usage:
        // 256x256 tile size with 16px overlap padding
        let tile_size: u32 = 256;
        let tile_pad: u32 = 16;

        if orig_w <= tile_size && orig_h <= tile_size {
            // Small enough to upscale directly in a single pass
            final_rgb = Self::run_tile_inference(&mut session, &rgb_img)?;
        } else {
            // Tiled inference
            let mut y = 0;
            while y < orig_h {
                let tile_h = (orig_h - y).min(tile_size);
                let mut x = 0;
                while x < orig_w {
                    let tile_w = (orig_w - x).min(tile_size);

                    let x_start = x.saturating_sub(tile_pad);
                    let x_end = (x + tile_w + tile_pad).min(orig_w);
                    let y_start = y.saturating_sub(tile_pad);
                    let y_end = (y + tile_h + tile_pad).min(orig_h);

                    let crop_w = x_end - x_start;
                    let crop_h = y_end - y_start;

                    let mut sub_tile = image::RgbImage::new(crop_w, crop_h);
                    for sy in 0..crop_h {
                        for sx in 0..crop_w {
                            sub_tile.put_pixel(sx, sy, *rgb_img.get_pixel(x_start + sx, y_start + sy));
                        }
                    }

                    let upscaled_tile = Self::run_tile_inference(&mut session, &sub_tile)?;

                    // Determine region to copy (excluding pad)
                    let out_crop_x = (x - x_start) * 4;
                    let out_crop_y = (y - y_start) * 4;
                    let out_w = tile_w * 4;
                    let out_h = tile_h * 4;

                    for dy in 0..out_h {
                        for dx in 0..out_w {
                            let px = upscaled_tile.get_pixel(out_crop_x + dx, out_crop_y + dy);
                            final_rgb.put_pixel(x * 4 + dx, y * 4 + dy, *px);
                        }
                    }

                    x += tile_size;
                }
                y += tile_size;
            }
        }

        // Handle alpha channel preservation if source has alpha
        let mut final_img = if has_alpha {
            let rgba = img.to_rgba8();
            let mut alpha_mask = GrayImage::new(orig_w, orig_h);
            for (x, y, pixel) in rgba.enumerate_pixels() {
                alpha_mask.put_pixel(x, y, Luma([pixel[3]]));
            }

            let upscaled_alpha = image::imageops::resize(
                &alpha_mask,
                target_4x_w,
                target_4x_h,
                image::imageops::FilterType::Lanczos3,
            );

            let mut out_rgba: RgbaImage = ImageBuffer::new(target_4x_w, target_4x_h);
            for y in 0..target_4x_h {
                for x in 0..target_4x_w {
                    let rgb = final_rgb.get_pixel(x, y);
                    let a = upscaled_alpha.get_pixel(x, y)[0];
                    out_rgba.put_pixel(x, y, Rgba([rgb[0], rgb[1], rgb[2], a]));
                }
            }
            DynamicImage::ImageRgba8(out_rgba)
        } else {
            DynamicImage::ImageRgb8(final_rgb)
        };

        // If target scale is 2x, downsample the 4x result to 2x with Lanczos3
        if target_scale == 2 {
            let target_w = orig_w * 2;
            let target_h = orig_h * 2;
            final_img = final_img.resize_exact(target_w, target_h, image::imageops::FilterType::Lanczos3);
        }

        Ok(final_img)
    }
}
