use std::fs::File;
use std::io::{BufReader, Cursor};
use std::path::Path;
use image::{DynamicImage, GenericImageView, ImageEncoder, ImageFormat};
use crate::models::{CropSettings, ExportResult, ExportSettings, ImageMetadata, ResizeSettings};

pub mod cutout;
pub mod upscale;

pub struct Pipeline;

impl Pipeline {
    pub fn read_metadata(path_str: &str) -> Result<ImageMetadata, String> {
        let path = Path::new(path_str);
        if !path.exists() {
            return Err(format!("File does not exist: {}", path_str));
        }

        let file_size = std::fs::metadata(path)
            .map_err(|e| format!("Failed to read metadata: {}", e))?
            .len();

        let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
        let mut buf_reader = BufReader::new(file);

        let reader = image::ImageReader::open(path)
            .map_err(|e| format!("Failed to open image reader: {}", e))?
            .with_guessed_format()
            .map_err(|e| format!("Failed to detect image format: {}", e))?;

        let format = reader.format().map(|f| format!("{:?}", f)).unwrap_or_else(|| "Unknown".to_string());
        
        let (width, height) = reader.into_dimensions().map_err(|e| format!("Failed to read image dimensions: {}", e))?;

        // Read EXIF tags if available
        let mut exif_orientation = None;
        let mut camera_model = None;
        let mut date_taken = None;

        if let Ok(exif_reader) = exif::Reader::new().read_from_container(&mut buf_reader) {
            if let Some(field) = exif_reader.get_field(exif::Tag::Orientation, exif::In::PRIMARY) {
                if let exif::Value::Short(ref vec) = field.value {
                    if let Some(&val) = vec.first() {
                        exif_orientation = Some(val as u32);
                    }
                }
            }
            if let Some(field) = exif_reader.get_field(exif::Tag::Model, exif::In::PRIMARY) {
                camera_model = Some(field.display_value().to_string().trim_matches('"').to_string());
            }
            if let Some(field) = exif_reader.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY) {
                date_taken = Some(field.display_value().to_string().trim_matches('"').to_string());
            }
        }

        // Adjust dimensions if EXIF orientation swaps them (e.g. 6 or 8 is 90 deg rotation)
        let (final_w, final_h) = match exif_orientation {
            Some(5) | Some(6) | Some(7) | Some(8) => (height, width),
            _ => (width, height),
        };

        // Determine alpha support
        let has_alpha = matches!(format.to_lowercase().as_str(), "png" | "webp" | "gif" | "ico");

        Ok(ImageMetadata {
            width: final_w,
            height: final_h,
            format,
            file_size,
            has_alpha,
            exif_orientation,
            camera_model,
            date_taken,
        })
    }

    pub fn load_and_orient(path_str: &str) -> Result<DynamicImage, String> {
        let path = Path::new(path_str);
        let orientation = {
            if let Ok(file) = File::open(path) {
                let mut buf_reader = BufReader::new(file);
                if let Ok(exif_reader) = exif::Reader::new().read_from_container(&mut buf_reader) {
                    exif_reader.get_field(exif::Tag::Orientation, exif::In::PRIMARY)
                        .and_then(|f| {
                            if let exif::Value::Short(ref vec) = f.value {
                                vec.first().copied()
                            } else {
                                None
                            }
                        })
                } else {
                    None
                }
            } else {
                None
            }
        };

        let img = image::open(path).map_err(|e| format!("Failed to open image: {}", e))?;

        let oriented = match orientation {
            Some(2) => img.fliph(),
            Some(3) => img.rotate180(),
            Some(4) => img.flipv(),
            Some(5) => img.rotate90().fliph(),
            Some(6) => img.rotate90(),
            Some(7) => img.rotate270().fliph(),
            Some(8) => img.rotate270(),
            _ => img,
        };

        Ok(oriented)
    }

    pub fn apply_transforms(
        mut img: DynamicImage,
        crop: Option<&CropSettings>,
        rotate: Option<i32>,
        flip_h: Option<bool>,
        flip_v: Option<bool>,
    ) -> DynamicImage {
        // 1. Crop
        if let Some(c) = crop {
            let (orig_w, orig_h) = (img.width(), img.height());
            let crop_x = c.x.min(orig_w);
            let crop_y = c.y.min(orig_h);
            let crop_w = c.width.min(orig_w.saturating_sub(crop_x));
            let crop_h = c.height.min(orig_h.saturating_sub(crop_y));

            if crop_w > 0 && crop_h > 0 {
                img = img.crop_imm(crop_x, crop_y, crop_w, crop_h);
            }
        }

        // 2. Rotate
        if let Some(deg) = rotate {
            let normalized = ((deg % 360) + 360) % 360;
            img = match normalized {
                90 => img.rotate90(),
                180 => img.rotate180(),
                270 => img.rotate270(),
                _ => img,
            };
        }

        // 3. Flip
        if flip_h.unwrap_or(false) {
            img = img.fliph();
        }
        if flip_v.unwrap_or(false) {
            img = img.flipv();
        }

        img
    }

    pub fn apply_resize(mut img: DynamicImage, resize: Option<&ResizeSettings>) -> DynamicImage {
        if let Some(r) = resize {
            let current_w = img.width();
            let current_h = img.height();

            if current_w == 0 || current_h == 0 {
                return img;
            }

            let req_w = r.width.unwrap_or(current_w);
            let req_h = r.height.unwrap_or(current_h);

            if req_w == 0 || req_h == 0 {
                return img;
            }

            if req_w != current_w || req_h != current_h {
                if r.preserve_aspect_ratio {
                    let ratio = (current_w as f64) / (current_h as f64);
                    let (target_w, target_h) = if r.width.is_some() && r.height.is_none() {
                        let calc_h = ((req_w as f64) / ratio).round().max(1.0) as u32;
                        (req_w, calc_h)
                    } else if r.height.is_some() && r.width.is_none() {
                        let calc_w = ((req_h as f64) * ratio).round().max(1.0) as u32;
                        (calc_w, req_h)
                    } else {
                        // Fit inside bounding box while preserving ratio (contain)
                        let scale_w = (req_w as f64) / (current_w as f64);
                        let scale_h = (req_h as f64) / (current_h as f64);
                        let scale = scale_w.min(scale_h);
                        let final_w = ((current_w as f64) * scale).round().max(1.0) as u32;
                        let final_h = ((current_h as f64) * scale).round().max(1.0) as u32;
                        (final_w, final_h)
                    };
                    img = img.resize_exact(target_w, target_h, image::imageops::FilterType::Lanczos3);
                } else {
                    img = img.resize_exact(req_w, req_h, image::imageops::FilterType::Lanczos3);
                }
            }
        }
        img
    }

    pub fn parse_hex_color(hex: &str) -> Option<[u8; 3]> {
        let clean = hex.trim_start_matches('#');
        if clean.len() == 6 {
            let r = u8::from_str_radix(&clean[0..2], 16).ok()?;
            let g = u8::from_str_radix(&clean[2..4], 16).ok()?;
            let b = u8::from_str_radix(&clean[4..6], 16).ok()?;
            Some([r, g, b])
        } else if clean.len() == 3 {
            let r = u8::from_str_radix(&clean[0..1].repeat(2), 16).ok()?;
            let g = u8::from_str_radix(&clean[1..2].repeat(2), 16).ok()?;
            let b = u8::from_str_radix(&clean[2..3].repeat(2), 16).ok()?;
            Some([r, g, b])
        } else {
            None
        }
    }

    pub fn flatten_transparency(img: &DynamicImage, hex_bg: Option<&str>) -> DynamicImage {
        let bg_color = hex_bg.and_then(Self::parse_hex_color).unwrap_or([255, 255, 255]);
        let rgba = img.to_rgba8();
        let (w, h) = rgba.dimensions();

        let mut out = image::RgbImage::new(w, h);

        for (x, y, pixel) in rgba.enumerate_pixels() {
            let alpha = pixel[3] as f32 / 255.0;
            let inv_alpha = 1.0 - alpha;

            let r = ((pixel[0] as f32 * alpha) + (bg_color[0] as f32 * inv_alpha)).round() as u8;
            let g = ((pixel[1] as f32 * alpha) + (bg_color[1] as f32 * inv_alpha)).round() as u8;
            let b = ((pixel[2] as f32 * alpha) + (bg_color[2] as f32 * inv_alpha)).round() as u8;

            out.put_pixel(x, y, image::Rgb([r, g, b]));
        }

        DynamicImage::ImageRgb8(out)
    }

    pub fn encode_to_bytes(
        img: &DynamicImage,
        format_str: &str,
        quality: Option<u8>,
        flatten_bg: Option<&str>,
    ) -> Result<(Vec<u8>, String), String> {
        let fmt = format_str.to_lowercase();
        let mut buffer = Vec::new();

        match fmt.as_str() {
            "jpeg" | "jpg" => {
                // JPEG requires flattening transparency
                let flattened = Self::flatten_transparency(img, flatten_bg);
                let rgb = flattened.to_rgb8();
                let q = quality.unwrap_or(85).clamp(1, 100);

                let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, q);
                encoder
                    .encode(
                        rgb.as_raw(),
                        rgb.width(),
                        rgb.height(),
                        image::ExtendedColorType::Rgb8,
                    )
                    .map_err(|e| format!("JPEG encoding failed: {}", e))?;

                Ok((buffer, "jpeg".to_string()))
            }
            "webp" => {
                let q = quality.unwrap_or(80).clamp(1, 100);
                let rgba = img.to_rgba8();
                let encoder = image::codecs::webp::WebPEncoder::new_lossless(&mut buffer);

                // Note: image crate WebPEncoder supports lossless directly; for lossy webp or lossless:
                if q >= 100 {
                    encoder
                        .encode(
                            rgba.as_raw(),
                            rgba.width(),
                            rgba.height(),
                            image::ExtendedColorType::Rgba8,
                        )
                        .map_err(|e| format!("WebP encoding failed: {}", e))?;
                } else {
                    // Re-encode via WebPEncoder
                    encoder
                        .encode(
                            rgba.as_raw(),
                            rgba.width(),
                            rgba.height(),
                            image::ExtendedColorType::Rgba8,
                        )
                        .map_err(|e| format!("WebP encoding failed: {}", e))?;
                }

                Ok((buffer, "webp".to_string()))
            }
            _ => {
                // PNG default (lossless)
                let rgba = img.to_rgba8();
                let encoder = image::codecs::png::PngEncoder::new(&mut buffer);
                encoder
                    .write_image(
                        rgba.as_raw(),
                        rgba.width(),
                        rgba.height(),
                        image::ExtendedColorType::Rgba8,
                    )
                    .map_err(|e| format!("PNG encoding failed: {}", e))?;

                Ok((buffer, "png".to_string()))
            }
        }
    }

    pub fn load_image(source: &str) -> Result<DynamicImage, String> {
        if source.starts_with("data:") {
            let comma = source.find(',').ok_or_else(|| "Invalid data URL format".to_string())?;
            let base64_data = &source[comma + 1..];
            let bytes = base64::Engine::decode(
                &base64::engine::general_purpose::STANDARD,
                base64_data,
            ).map_err(|e| format!("Failed to decode base64 data URL: {}", e))?;
            image::load_from_memory(&bytes).map_err(|e| format!("Failed to decode image from memory: {}", e))
        } else {
            Self::load_and_orient(source)
        }
    }

    pub fn export(
        source_path: &str,
        dest_path: &str,
        settings: ExportSettings,
    ) -> Result<ExportResult, String> {
        let start_time = std::time::Instant::now();

        let orig_size = if source_path.starts_with("data:") {
            source_path.len() as u64
        } else {
            std::fs::metadata(source_path)
                .map(|m| m.len())
                .unwrap_or(0)
        };

        let mut img = Self::load_image(source_path)?;

        // Apply background removal if requested
        if settings.remove_background.unwrap_or(false) {
            img = cutout::CutoutEngine::remove_background(&img, settings.cutout_model.as_deref(), None)?;
        }

        // Apply transformations
        img = Self::apply_transforms(
            img,
            settings.crop.as_ref(),
            settings.rotate,
            settings.flip_horizontal,
            settings.flip_vertical,
        );

        // Apply upscaling if requested
        if let Some(scale) = settings.upscale_scale {
            if scale == 2 || scale == 4 {
                img = upscale::UpscaleEngine::upscale(&img, settings.upscale_model.as_deref(), scale)?;
            }
        }

        // Apply resize
        img = Self::apply_resize(img, settings.resize.as_ref());

        let final_w = img.width();
        let final_h = img.height();

        // Encode
        let (bytes, _) = Self::encode_to_bytes(
            &img,
            &settings.format,
            settings.quality,
            settings.flatten_background.as_deref(),
        )?;

        // Write to destination
        std::fs::write(dest_path, &bytes)
            .map_err(|e| format!("Failed to write export file: {}", e))?;

        let output_size = bytes.len() as u64;
        let saved_bytes = (orig_size as i64) - (output_size as i64);
        let saved_percentage = if orig_size > 0 {
            ((saved_bytes as f64) / (orig_size as f64)) * 100.0
        } else {
            0.0
        };

        Ok(ExportResult {
            output_path: dest_path.to_string(),
            width: final_w,
            height: final_h,
            original_size: orig_size,
            output_size,
            saved_bytes,
            saved_percentage,
            duration_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    pub fn get_preview_data_url(path_str: &str, max_dim: Option<u32>) -> Result<String, String> {
        let mut img = Self::load_image(path_str)?;
        let max_d = max_dim.unwrap_or(1920);

        let (w, h) = img.dimensions();
        if w > max_d || h > max_d {
            let scale = (max_d as f64) / ((w.max(h)) as f64);
            let target_w = ((w as f64) * scale).round().max(1.0) as u32;
            let target_h = ((h as f64) * scale).round().max(1.0) as u32;
            img = img.resize_exact(target_w, target_h, image::imageops::FilterType::Triangle);
        }

        let mut buffer = Cursor::new(Vec::new());
        img.write_to(&mut buffer, ImageFormat::Png)
            .map_err(|e| format!("Failed to write preview buffer: {}", e))?;

        let base64_str = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            buffer.get_ref(),
        );

        Ok(format!("data:image/png;base64,{}", base64_str))
    }

    pub fn is_cutout_model_ready(model_id: Option<&str>) -> bool {
        cutout::CutoutEngine::is_model_ready(model_id)
    }

    pub fn download_cutout_model(model_id: Option<&str>, hf_token: Option<&str>) -> Result<(), String> {
        cutout::CutoutEngine::ensure_model(model_id, hf_token).map(|_| ())
    }

    pub fn remove_background_data_url(
        source: &str,
        model_id: Option<&str>,
        hf_token: Option<&str>,
        max_dim: Option<u32>,
    ) -> Result<String, String> {
        let mut img = Self::load_image(source)?;
        let max_d = max_dim.unwrap_or(1920);

        let (w, h) = img.dimensions();
        if w > max_d || h > max_d {
            let scale = (max_d as f64) / ((w.max(h)) as f64);
            let target_w = ((w as f64) * scale).round().max(1.0) as u32;
            let target_h = ((h as f64) * scale).round().max(1.0) as u32;
            img = img.resize_exact(target_w, target_h, image::imageops::FilterType::Triangle);
        }

        let cutout_img = cutout::CutoutEngine::remove_background(&img, model_id, hf_token)?;

        let mut buffer = Cursor::new(Vec::new());
        cutout_img.write_to(&mut buffer, ImageFormat::Png)
            .map_err(|e| format!("Failed to encode cutout PNG: {}", e))?;

        let base64_str = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            buffer.get_ref(),
        );

        Ok(format!("data:image/png;base64,{}", base64_str))
    }

    pub fn is_upscale_model_ready(model_id: Option<&str>) -> bool {
        upscale::UpscaleEngine::is_model_ready(model_id)
    }

    pub fn download_upscale_model(model_id: Option<&str>) -> Result<(), String> {
        upscale::UpscaleEngine::ensure_model(model_id).map(|_| ())
    }

    pub fn upscale_preview_data_url(
        source: &str,
        model_id: Option<&str>,
        scale: u32,
        max_dim: Option<u32>,
    ) -> Result<String, String> {
        let mut img = Self::load_image(source)?;
        let max_d = max_dim.unwrap_or(1920);

        let (w, h) = img.dimensions();
        if w > max_d || h > max_d {
            let scale_factor = (max_d as f64) / ((w.max(h)) as f64);
            let target_w = ((w as f64) * scale_factor).round().max(1.0) as u32;
            let target_h = ((h as f64) * scale_factor).round().max(1.0) as u32;
            img = img.resize_exact(target_w, target_h, image::imageops::FilterType::Triangle);
        }

        let upscaled_img = upscale::UpscaleEngine::upscale(&img, model_id, scale)?;

        let mut buffer = Cursor::new(Vec::new());
        upscaled_img.write_to(&mut buffer, ImageFormat::Png)
            .map_err(|e| format!("Failed to encode upscaled PNG: {}", e))?;

        let base64_str = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            buffer.get_ref(),
        );

        Ok(format!("data:image/png;base64,{}", base64_str))
    }

    pub fn is_cuda_available() -> bool {
        #[cfg(target_os = "linux")]
        {
            use std::ffi::CString;
            // ONNX Runtime CUDA execution provider requires libcudnn.so for convolution layers.
            // On Linux, ONNX Runtime attempts to dlopen("libcudnn.so").
            let lib_names = ["libcudnn.so", "libcudnn.so.9", "libcudnn.so.8"];
            for name in lib_names {
                if let Ok(cname) = CString::new(name) {
                    let handle = unsafe { libc::dlopen(cname.as_ptr(), libc::RTLD_LAZY | libc::RTLD_LOCAL) };
                    if !handle.is_null() {
                        unsafe { libc::dlclose(handle) };
                        return true;
                    }
                }
            }
            false
        }
        #[cfg(not(target_os = "linux"))]
        {
            false
        }
    }
}

#[cfg(test)]
mod tests;
