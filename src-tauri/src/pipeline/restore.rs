use std::path::PathBuf;
use image::{DynamicImage, GenericImageView, Rgba, RgbaImage};
use ndarray::Array4;
use ort::session::Session;
use super::model_cache::{self, ModelSpec};
use super::Pipeline;

/// A restoration model plus the tiling parameters its architecture was tuned for.
pub struct RestoreModel {
    pub spec: ModelSpec,
    pub tile_size: u32,
    pub tile_pad: u32,
    /// Every tile is padded up to a multiple of this before inference. NAFNet
    /// downsamples four times; SCUNet's swin blocks additionally need whole
    /// 8x8 attention windows at 1/8 resolution, so it needs a coarser multiple.
    pub shape_multiple: u32,
}

pub const NAFNET_REDS: RestoreModel = RestoreModel {
    spec: ModelSpec {
        id: "nafnet-reds",
        filename: "NAFNet-REDS-width64.onnx",
        primary_url: "https://huggingface.co/deepghs/image_restoration/resolve/main/NAFNet-REDS-width64.onnx",
        fallback_url: None,
        candidates: &["NAFNet-REDS-width64.onnx"],
        min_size: 250_000_000,
    },
    tile_size: 256,
    tile_pad: 16,
    shape_multiple: 32,
};

pub const NAFNET_GOPRO: RestoreModel = RestoreModel {
    spec: ModelSpec {
        id: "nafnet-gopro",
        filename: "NAFNet-GoPro-width64.onnx",
        primary_url: "https://huggingface.co/deepghs/image_restoration/resolve/main/NAFNet-GoPro-width64.onnx",
        fallback_url: None,
        candidates: &["NAFNet-GoPro-width64.onnx"],
        min_size: 250_000_000,
    },
    tile_size: 256,
    tile_pad: 16,
    shape_multiple: 32,
};

pub const NAFNET_SIDD: RestoreModel = RestoreModel {
    spec: ModelSpec {
        id: "nafnet-sidd",
        filename: "NAFNet-SIDD-width64.onnx",
        primary_url: "https://huggingface.co/deepghs/image_restoration/resolve/main/NAFNet-SIDD-width64.onnx",
        fallback_url: None,
        candidates: &["NAFNet-SIDD-width64.onnx"],
        min_size: 420_000_000,
    },
    tile_size: 256,
    tile_pad: 16,
    shape_multiple: 32,
};

pub const SCUNET_GAN: RestoreModel = RestoreModel {
    spec: ModelSpec {
        id: "scunet-gan",
        filename: "SCUNet-GAN.onnx",
        primary_url: "https://huggingface.co/deepghs/image_restoration/resolve/main/SCUNet-GAN.onnx",
        fallback_url: None,
        candidates: &["SCUNet-GAN.onnx"],
        min_size: 80_000_000,
    },
    tile_size: 128,
    tile_pad: 16,
    shape_multiple: 64,
};

pub const SCUNET_PSNR: RestoreModel = RestoreModel {
    spec: ModelSpec {
        id: "scunet-psnr",
        filename: "SCUNet-PSNR.onnx",
        primary_url: "https://huggingface.co/deepghs/image_restoration/resolve/main/SCUNet-PSNR.onnx",
        fallback_url: None,
        candidates: &["SCUNet-PSNR.onnx"],
        min_size: 80_000_000,
    },
    tile_size: 128,
    tile_pad: 16,
    shape_multiple: 64,
};

pub struct RestoreEngine;

impl RestoreEngine {
    pub fn get_model(model_id: Option<&str>) -> &'static RestoreModel {
        match model_id.unwrap_or("nafnet-reds").trim().to_lowercase().as_str() {
            "nafnet-gopro" | "gopro" | "deblur" => &NAFNET_GOPRO,
            "nafnet-sidd" | "sidd" => &NAFNET_SIDD,
            "scunet-gan" | "gan" => &SCUNET_GAN,
            "scunet-psnr" | "psnr" => &SCUNET_PSNR,
            _ => &NAFNET_REDS,
        }
    }

    pub fn get_spec(model_id: Option<&str>) -> &'static ModelSpec {
        &Self::get_model(model_id).spec
    }

    pub fn get_model_path(model_id: Option<&str>) -> Result<PathBuf, String> {
        model_cache::model_path(Self::get_spec(model_id))
    }

    pub fn is_model_ready(model_id: Option<&str>) -> bool {
        model_cache::is_model_ready(Self::get_spec(model_id))
    }

    pub fn ensure_model(model_id: Option<&str>) -> Result<PathBuf, String> {
        model_cache::ensure_model(Self::get_spec(model_id))
    }

    /// Grows a tile to a multiple of the model's required shape by repeating edge pixels.
    fn pad_to_multiple(tile: &image::RgbImage, multiple: u32) -> image::RgbImage {
        let (w, h) = tile.dimensions();
        let pad_w = w.div_ceil(multiple) * multiple;
        let pad_h = h.div_ceil(multiple) * multiple;

        if pad_w == w && pad_h == h {
            return tile.clone();
        }

        let mut padded = image::RgbImage::new(pad_w, pad_h);
        for y in 0..pad_h {
            let sy = y.min(h - 1);
            for x in 0..pad_w {
                let sx = x.min(w - 1);
                padded.put_pixel(x, y, *tile.get_pixel(sx, sy));
            }
        }
        padded
    }

    /// Runs one tile through the model. Input and output are both NCHW float in 0..1
    /// at identical resolution, so the result is cropped back to the tile's real size.
    fn run_tile_inference(
        session: &mut Session,
        tile_rgb: &image::RgbImage,
        shape_multiple: u32,
    ) -> Result<image::RgbImage, String> {
        let (real_w, real_h) = tile_rgb.dimensions();
        let padded = Self::pad_to_multiple(tile_rgb, shape_multiple);
        let (tile_w, tile_h) = padded.dimensions();

        let mut input_array = Array4::<f32>::zeros((1, 3, tile_h as usize, tile_w as usize));
        for y in 0..tile_h {
            for x in 0..tile_w {
                let pixel = padded.get_pixel(x, y);
                input_array[[0, 0, y as usize, x as usize]] = pixel[0] as f32 / 255.0;
                input_array[[0, 1, y as usize, x as usize]] = pixel[1] as f32 / 255.0;
                input_array[[0, 2, y as usize, x as usize]] = pixel[2] as f32 / 255.0;
            }
        }

        let input_tensor = ort::value::Tensor::from_array(input_array)
            .map_err(|e| format!("Failed to create input tensor: {}", e))?;

        let outputs = session
            .run(ort::inputs![input_tensor])
            .map_err(|e| format!("Restoration inference failed: {}", e))?;

        let (_, output_tensor) = outputs
            .into_iter()
            .next()
            .ok_or_else(|| "No output tensor returned".to_string())?;

        let (shape, data_slice) = output_tensor
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("Failed to extract output tensor: {}", e))?;

        // Shape is [1, 3, out_h, out_w] and matches the padded input resolution.
        let out_h = shape[2] as u32;
        let out_w = shape[3] as u32;
        if out_w < real_w || out_h < real_h {
            return Err(format!(
                "Restoration model returned {}x{} for a {}x{} tile",
                out_w, out_h, real_w, real_h
            ));
        }

        let channel_stride = (out_w * out_h) as usize;
        let mut out_img = image::RgbImage::new(real_w, real_h);
        for y in 0..real_h {
            for x in 0..real_w {
                let idx = (y * out_w + x) as usize;
                let r = (data_slice.get(idx).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                let g = (data_slice.get(idx + channel_stride).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                let b = (data_slice.get(idx + channel_stride * 2).copied().unwrap_or(0.0).clamp(0.0, 1.0) * 255.0).round() as u8;
                out_img.put_pixel(x, y, image::Rgb([r, g, b]));
            }
        }

        Ok(out_img)
    }

    /// Restores an image at its original resolution. Alpha is carried through untouched.
    pub fn restore(img: &DynamicImage, model_id: Option<&str>) -> Result<DynamicImage, String> {
        let model = Self::get_model(model_id);
        let model_path = Self::ensure_model(model_id)?;

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

        let mut session = builder
            .with_intra_threads(4)
            .map_err(|e| format!("Failed to configure intra threads: {}", e))?
            .with_inter_threads(1)
            .map_err(|e| format!("Failed to configure inter threads: {}", e))?
            .commit_from_file(&model_path)
            .map_err(|e| format!("Failed to load ONNX restoration model: {}", e))?;

        let (orig_w, orig_h) = img.dimensions();
        if orig_w == 0 || orig_h == 0 {
            return Err("Cannot restore empty image".to_string());
        }

        let has_alpha = img.color().has_alpha();
        let rgb_img = img.to_rgb8();
        let tile_size = model.tile_size;
        let tile_pad = model.tile_pad;

        let restored_rgb = if orig_w <= tile_size && orig_h <= tile_size {
            Self::run_tile_inference(&mut session, &rgb_img, model.shape_multiple)?
        } else {
            let mut out_rgb = image::RgbImage::new(orig_w, orig_h);
            let mut y = 0;
            while y < orig_h {
                let tile_h = (orig_h - y).min(tile_size);
                let mut x = 0;
                while x < orig_w {
                    let tile_w = (orig_w - x).min(tile_size);

                    // Grow the tile by the overlap pad so seams get context, then keep the centre.
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

                    let restored_tile = Self::run_tile_inference(&mut session, &sub_tile, model.shape_multiple)?;

                    let inner_x = x - x_start;
                    let inner_y = y - y_start;
                    for dy in 0..tile_h {
                        for dx in 0..tile_w {
                            let px = restored_tile.get_pixel(inner_x + dx, inner_y + dy);
                            out_rgb.put_pixel(x + dx, y + dy, *px);
                        }
                    }

                    x += tile_size;
                }
                y += tile_size;
            }
            out_rgb
        };

        if has_alpha {
            let source_rgba = img.to_rgba8();
            let mut out_rgba = RgbaImage::new(orig_w, orig_h);
            for y in 0..orig_h {
                for x in 0..orig_w {
                    let rgb = restored_rgb.get_pixel(x, y);
                    let a = source_rgba.get_pixel(x, y)[3];
                    out_rgba.put_pixel(x, y, Rgba([rgb[0], rgb[1], rgb[2], a]));
                }
            }
            Ok(DynamicImage::ImageRgba8(out_rgba))
        } else {
            Ok(DynamicImage::ImageRgb8(restored_rgb))
        }
    }
}
