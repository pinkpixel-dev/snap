use std::collections::VecDeque;
use std::path::PathBuf;
use image::{DynamicImage, GenericImageView, GrayImage, RgbImage, Rgba, RgbaImage};
use ndarray::Array4;
use ort::session::Session;
use super::model_cache::{self, ModelSpec};
use super::Pipeline;

pub const LAMA_SPEC: ModelSpec = ModelSpec {
    id: "lama",
    filename: "inpainting_lama_2025jan.onnx",
    primary_url: "https://huggingface.co/opencv/inpainting_lama/resolve/main/inpainting_lama_2025jan.onnx",
    // Carve's original fp32 export. Same graph signature, 208 MB instead of 92 MB,
    // and its fill is within a few levels of the primary, so it works as a mirror.
    fallback_url: Some("https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx"),
    candidates: &["inpainting_lama_2025jan.onnx", "lama_fp32.onnx"],
    min_size: 80_000_000,
    companions: &[],
};

/// LaMa is exported with its spatial dimensions baked in, so every run is 512x512
/// no matter how large the source image is.
const MODEL_SIZE: u32 = 512;

/// A mask that stops exactly at the object leaves a rim of the original pixels
/// behind, which reads as a ghost outline. Growing it slightly hides that seam.
const DILATE_FRACTION: f32 = 0.01;
const DILATE_MIN: u32 = 4;
const DILATE_MAX: u32 = 32;

/// The model needs to see intact surroundings to invent a plausible fill, so the
/// 512 window covers noticeably more than the hole itself.
const CONTEXT_PAD: f32 = 0.5;

/// One pass of a sliding-window maximum over a slice, using a monotonic deque so
/// the cost does not grow with the radius. Large masks on large photos otherwise
/// spend real time here.
fn max_filter_1d(src: &[u8], len: usize, radius: usize, dst: &mut [u8]) {
    let mut window: VecDeque<usize> = VecDeque::new();
    let mut read = 0usize;

    for write in 0..len {
        let limit = (write + radius).min(len - 1);
        while read <= limit {
            while window.back().map_or(false, |&i| src[i] <= src[read]) {
                window.pop_back();
            }
            window.push_back(read);
            read += 1;
        }
        while let Some(&front) = window.front() {
            if front + radius < write {
                window.pop_front();
            } else {
                break;
            }
        }
        dst[write] = window.front().map_or(0, |&i| src[i]);
    }
}

/// Grows the white areas of a mask by `radius` pixels, separably.
pub(super) fn dilate(mask: &GrayImage, radius: u32) -> GrayImage {
    if radius == 0 {
        return mask.clone();
    }

    let (w, h) = mask.dimensions();
    let r = radius as usize;
    let mut horizontal = GrayImage::new(w, h);

    let mut row = vec![0u8; w as usize];
    let mut row_out = vec![0u8; w as usize];
    for y in 0..h {
        for x in 0..w {
            row[x as usize] = mask.get_pixel(x, y)[0];
        }
        max_filter_1d(&row, w as usize, r, &mut row_out);
        for x in 0..w {
            horizontal.put_pixel(x, y, image::Luma([row_out[x as usize]]));
        }
    }

    let mut out = GrayImage::new(w, h);
    let mut col = vec![0u8; h as usize];
    let mut col_out = vec![0u8; h as usize];
    for x in 0..w {
        for y in 0..h {
            col[y as usize] = horizontal.get_pixel(x, y)[0];
        }
        max_filter_1d(&col, h as usize, r, &mut col_out);
        for y in 0..h {
            out.put_pixel(x, y, image::Luma([col_out[y as usize]]));
        }
    }

    out
}

/// Tight bounding box of every non-zero pixel, or None for an empty mask.
pub(super) fn mask_bounds(mask: &GrayImage) -> Option<(u32, u32, u32, u32)> {
    let (w, h) = mask.dimensions();
    let (mut min_x, mut min_y, mut max_x, mut max_y) = (u32::MAX, u32::MAX, 0u32, 0u32);
    let mut found = false;

    for y in 0..h {
        for x in 0..w {
            if mask.get_pixel(x, y)[0] > 0 {
                found = true;
                min_x = min_x.min(x);
                min_y = min_y.min(y);
                max_x = max_x.max(x);
                max_y = max_y.max(y);
            }
        }
    }

    if found {
        Some((min_x, min_y, max_x - min_x + 1, max_y - min_y + 1))
    } else {
        None
    }
}

/// Picks the square window that gets fed to the model: the hole plus context,
/// clamped to the image. Running a crop instead of the whole photo is what keeps
/// a fixed 512 model usable on a 4000px source, since only the crop pays for the
/// downscale and everything outside the mask is left untouched anyway.
pub(super) fn context_window(img_w: u32, img_h: u32, bounds: (u32, u32, u32, u32)) -> (u32, u32, u32, u32) {
    let (bx, by, bw, bh) = bounds;

    let pad_x = (bw as f32 * CONTEXT_PAD).round() as u32;
    let pad_y = (bh as f32 * CONTEXT_PAD).round() as u32;
    let want = (bw + pad_x * 2).max(bh + pad_y * 2).max(64);
    let side = want.min(img_w).min(img_h);

    let cx = bx + bw / 2;
    let cy = by + bh / 2;
    let x = cx.saturating_sub(side / 2).min(img_w - side);
    let y = cy.saturating_sub(side / 2).min(img_h - side);

    (x, y, side, side)
}

pub struct LamaEngine;

impl LamaEngine {
    pub fn get_spec() -> &'static ModelSpec {
        &LAMA_SPEC
    }

    pub fn is_model_ready() -> bool {
        model_cache::is_model_ready(Self::get_spec())
    }

    pub fn ensure_model() -> Result<PathBuf, String> {
        model_cache::ensure_model(Self::get_spec())
    }

    /// Removes whatever the mask covers and fills the hole with LaMa's guess at
    /// what belongs there. Pixels outside the dilated mask are copied straight
    /// from the source, so the rest of the photo is bit-for-bit unchanged.
    pub fn inpaint(img: &DynamicImage, mask: &GrayImage, invert: bool) -> Result<DynamicImage, String> {
        let (w, h) = img.dimensions();
        if w == 0 || h == 0 {
            return Err("Cannot inpaint an empty image".to_string());
        }

        let (mw, mh) = mask.dimensions();
        let scaled_mask = if mw != w || mh != h {
            image::imageops::resize(mask, w, h, image::imageops::FilterType::Triangle)
        } else {
            mask.clone()
        };

        // Soft mask edges become a half-erased halo, so the selection is made
        // binary before it is grown.
        let mut binary = GrayImage::new(w, h);
        for y in 0..h {
            for x in 0..w {
                let m = scaled_mask.get_pixel(x, y)[0];
                let selected = if invert { 255 - m } else { m };
                binary.put_pixel(x, y, image::Luma([if selected >= 128 { 255 } else { 0 }]));
            }
        }

        let radius = ((w.min(h) as f32 * DILATE_FRACTION).round() as u32).clamp(DILATE_MIN, DILATE_MAX);
        let grown = dilate(&binary, radius);

        let bounds = mask_bounds(&grown)
            .ok_or_else(|| "Nothing is selected to remove".to_string())?;
        let (win_x, win_y, win_w, win_h) = context_window(w, h, bounds);

        let rgb = img.to_rgb8();
        let crop_rgb = image::imageops::crop_imm(&rgb, win_x, win_y, win_w, win_h).to_image();
        let crop_mask = image::imageops::crop_imm(&grown, win_x, win_y, win_w, win_h).to_image();

        let small_rgb = image::imageops::resize(
            &crop_rgb,
            MODEL_SIZE,
            MODEL_SIZE,
            image::imageops::FilterType::Triangle,
        );
        let small_mask = image::imageops::resize(
            &crop_mask,
            MODEL_SIZE,
            MODEL_SIZE,
            image::imageops::FilterType::Nearest,
        );

        let model_path = Self::ensure_model()?;

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
            .map_err(|e| format!("Failed to load ONNX inpainting model: {}", e))?;

        // LaMa takes RGB in 0..1 despite OpenCV's demo feeding it BGR, and a mask
        // of hard 0 or 1 values.
        let size = MODEL_SIZE as usize;
        let mut image_input = Array4::<f32>::zeros((1, 3, size, size));
        let mut mask_input = Array4::<f32>::zeros((1, 1, size, size));
        for y in 0..MODEL_SIZE {
            for x in 0..MODEL_SIZE {
                let p = small_rgb.get_pixel(x, y);
                image_input[[0, 0, y as usize, x as usize]] = p[0] as f32 / 255.0;
                image_input[[0, 1, y as usize, x as usize]] = p[1] as f32 / 255.0;
                image_input[[0, 2, y as usize, x as usize]] = p[2] as f32 / 255.0;
                mask_input[[0, 0, y as usize, x as usize]] =
                    if small_mask.get_pixel(x, y)[0] > 0 { 1.0 } else { 0.0 };
            }
        }

        let image_tensor = ort::value::Tensor::from_array(image_input)
            .map_err(|e| format!("Failed to create image tensor: {}", e))?;
        let mask_tensor = ort::value::Tensor::from_array(mask_input)
            .map_err(|e| format!("Failed to create mask tensor: {}", e))?;

        let outputs = session
            .run(ort::inputs!["image" => image_tensor, "mask" => mask_tensor])
            .map_err(|e| format!("Inpainting inference failed: {}", e))?;

        let (_, output_tensor) = outputs
            .into_iter()
            .next()
            .ok_or_else(|| "No output tensor returned".to_string())?;

        let (shape, data) = output_tensor
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("Failed to extract output tensor: {}", e))?;

        // Shape is [1, 3, 512, 512] and the values already sit in 0..255.
        let out_h = shape[2] as u32;
        let out_w = shape[3] as u32;
        let plane = (out_w * out_h) as usize;

        let mut filled = RgbImage::new(out_w, out_h);
        for y in 0..out_h {
            for x in 0..out_w {
                let i = (y * out_w + x) as usize;
                let ch = |c: usize| {
                    data.get(i + c * plane)
                        .copied()
                        .unwrap_or(0.0)
                        .clamp(0.0, 255.0)
                        .round() as u8
                };
                filled.put_pixel(x, y, image::Rgb([ch(0), ch(1), ch(2)]));
            }
        }

        let filled_full = image::imageops::resize(
            &filled,
            win_w,
            win_h,
            image::imageops::FilterType::Lanczos3,
        );

        // A one-pixel feather on the seam absorbs the rounding between the 512
        // result and the window it came from.
        let seam = image::imageops::blur(&crop_mask, 1.0);

        let src_rgba = img.to_rgba8();
        let mut out = RgbaImage::new(w, h);
        for y in 0..h {
            for x in 0..w {
                out.put_pixel(x, y, *src_rgba.get_pixel(x, y));
            }
        }

        for y in 0..win_h {
            for x in 0..win_w {
                let weight = seam.get_pixel(x, y)[0] as f32 / 255.0;
                if weight <= 0.0 {
                    continue;
                }
                let (gx, gy) = (win_x + x, win_y + y);
                let orig = *src_rgba.get_pixel(gx, gy);
                let new = filled_full.get_pixel(x, y);
                let blend = |o: u8, n: u8| (o as f32 * (1.0 - weight) + n as f32 * weight).round() as u8;
                out.put_pixel(
                    gx,
                    gy,
                    Rgba([
                        blend(orig[0], new[0]),
                        blend(orig[1], new[1]),
                        blend(orig[2], new[2]),
                        orig[3],
                    ]),
                );
            }
        }

        Ok(DynamicImage::ImageRgba8(out))
    }
}
