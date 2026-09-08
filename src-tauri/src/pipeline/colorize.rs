use std::path::PathBuf;
use image::{DynamicImage, GenericImageView, Rgba, RgbaImage};
use ndarray::Array4;
use ort::session::Session;
use super::model_cache::{self, ModelSpec};
use super::Pipeline;

pub const DDCOLOR_SPEC: ModelSpec = ModelSpec {
    id: "ddcolor",
    filename: "ddcolor-fp16.onnx",
    primary_url: "https://huggingface.co/wavespeed/image-colorizer/resolve/main/ddcolor-fp16.onnx",
    fallback_url: None,
    candidates: &["ddcolor-fp16.onnx"],
    min_size: 100_000_000,
    companions: &[],
};

/// DDColor is exported at a fixed input resolution.
const MODEL_SIZE: u32 = 256;

/// D65 white point, matching OpenCV's float sRGB to Lab conversion.
const WHITE_X: f32 = 0.950456;
const WHITE_Y: f32 = 1.0;
const WHITE_Z: f32 = 1.088754;

fn srgb_to_linear(c: f32) -> f32 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

fn linear_to_srgb(c: f32) -> f32 {
    if c <= 0.0031308 {
        c * 12.92
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

fn lab_f(t: f32) -> f32 {
    const DELTA: f32 = 6.0 / 29.0;
    if t > DELTA * DELTA * DELTA {
        t.cbrt()
    } else {
        t / (3.0 * DELTA * DELTA) + 4.0 / 29.0
    }
}

fn lab_f_inv(t: f32) -> f32 {
    const DELTA: f32 = 6.0 / 29.0;
    if t > DELTA {
        t * t * t
    } else {
        3.0 * DELTA * DELTA * (t - 4.0 / 29.0)
    }
}

/// sRGB in 0..1 to CIE Lab with L in 0..100 and a/b roughly -128..127.
pub fn rgb_to_lab(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    let (rl, gl, bl) = (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b));

    let x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / WHITE_X;
    let y = (0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl) / WHITE_Y;
    let z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) / WHITE_Z;

    let (fx, fy, fz) = (lab_f(x), lab_f(y), lab_f(z));

    (116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz))
}

pub fn lab_to_rgb(l: f32, a: f32, b: f32) -> (f32, f32, f32) {
    let fy = (l + 16.0) / 116.0;
    let fx = fy + a / 500.0;
    let fz = fy - b / 200.0;

    let x = lab_f_inv(fx) * WHITE_X;
    let y = lab_f_inv(fy) * WHITE_Y;
    let z = lab_f_inv(fz) * WHITE_Z;

    let rl = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let gl = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    let bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

    (
        linear_to_srgb(rl).clamp(0.0, 1.0),
        linear_to_srgb(gl).clamp(0.0, 1.0),
        linear_to_srgb(bl).clamp(0.0, 1.0),
    )
}

/// Bilinear upsample of a single float plane.
///
/// `image::imageops::resize` cannot be used here: it clamps samples to the
/// primitive's `DEFAULT_MAX_VALUE`, which is 1.0 for `f32`. Lab chroma runs to
/// roughly plus or minus 128, so passing it through that path silently flattens
/// the color to nothing and the picture comes back grey.
pub fn upsample_plane(src: &[f32], src_w: u32, src_h: u32, dst_w: u32, dst_h: u32) -> Vec<f32> {
    let mut out = vec![0.0f32; (dst_w * dst_h) as usize];
    if src_w == 0 || src_h == 0 {
        return out;
    }

    let x_ratio = src_w as f32 / dst_w as f32;
    let y_ratio = src_h as f32 / dst_h as f32;
    let max_x = src_w - 1;
    let max_y = src_h - 1;

    for y in 0..dst_h {
        // Sample at pixel centres so the edges do not drift half a pixel.
        let sy = ((y as f32 + 0.5) * y_ratio - 0.5).max(0.0);
        let y0 = (sy.floor() as u32).min(max_y);
        let y1 = (y0 + 1).min(max_y);
        let wy = sy - y0 as f32;

        for x in 0..dst_w {
            let sx = ((x as f32 + 0.5) * x_ratio - 0.5).max(0.0);
            let x0 = (sx.floor() as u32).min(max_x);
            let x1 = (x0 + 1).min(max_x);
            let wx = sx - x0 as f32;

            let p00 = src[(y0 * src_w + x0) as usize];
            let p01 = src[(y0 * src_w + x1) as usize];
            let p10 = src[(y1 * src_w + x0) as usize];
            let p11 = src[(y1 * src_w + x1) as usize];

            let top = p00 + (p01 - p00) * wx;
            let bottom = p10 + (p11 - p10) * wx;
            out[(y * dst_w + x) as usize] = top + (bottom - top) * wy;
        }
    }

    out
}

pub struct ColorizeEngine;

impl ColorizeEngine {
    pub fn get_spec() -> &'static ModelSpec {
        &DDCOLOR_SPEC
    }

    pub fn is_model_ready() -> bool {
        model_cache::is_model_ready(Self::get_spec())
    }

    pub fn ensure_model() -> Result<PathBuf, String> {
        model_cache::ensure_model(Self::get_spec())
    }

    /// Colorizes an image with DDColor. Lightness comes from the source at full
    /// resolution and only the chroma is predicted, which is why running the model
    /// at a fixed 256x256 and upsampling the a/b planes does not soften the result.
    pub fn colorize(img: &DynamicImage) -> Result<DynamicImage, String> {
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
            .map_err(|e| format!("Failed to load ONNX colorization model: {}", e))?;

        let (w, h) = img.dimensions();
        if w == 0 || h == 0 {
            return Err("Cannot colorize empty image".to_string());
        }

        let has_alpha = img.color().has_alpha();
        let rgb = img.to_rgb8();

        // Lightness of the original, kept at full resolution.
        let mut orig_l = vec![0.0f32; (w * h) as usize];
        for y in 0..h {
            for x in 0..w {
                let p = rgb.get_pixel(x, y);
                let (l, _, _) = rgb_to_lab(
                    p[0] as f32 / 255.0,
                    p[1] as f32 / 255.0,
                    p[2] as f32 / 255.0,
                );
                orig_l[(y * w + x) as usize] = l;
            }
        }

        // DDColor takes a neutral RGB image in 0..1, not a raw lightness channel.
        // The source is resized to 256x256, reduced to its Lab lightness with the
        // chroma zeroed, then converted back to sRGB. Feeding L in its native
        // 0..100 range instead puts the input two orders of magnitude out of
        // range and the model answers with essentially no color at all.
        let small = image::imageops::resize(
            &rgb,
            MODEL_SIZE,
            MODEL_SIZE,
            image::imageops::FilterType::Triangle,
        );

        let mut input_array = Array4::<f32>::zeros((1, 3, MODEL_SIZE as usize, MODEL_SIZE as usize));
        for y in 0..MODEL_SIZE {
            for x in 0..MODEL_SIZE {
                let p = small.get_pixel(x, y);
                let (l, _, _) = rgb_to_lab(
                    p[0] as f32 / 255.0,
                    p[1] as f32 / 255.0,
                    p[2] as f32 / 255.0,
                );
                let (r, g, b) = lab_to_rgb(l, 0.0, 0.0);
                input_array[[0, 0, y as usize, x as usize]] = r;
                input_array[[0, 1, y as usize, x as usize]] = g;
                input_array[[0, 2, y as usize, x as usize]] = b;
            }
        }

        let input_tensor = ort::value::Tensor::from_array(input_array)
            .map_err(|e| format!("Failed to create input tensor: {}", e))?;

        let outputs = session
            .run(ort::inputs![input_tensor])
            .map_err(|e| format!("Colorization inference failed: {}", e))?;

        let (_, output_tensor) = outputs
            .into_iter()
            .next()
            .ok_or_else(|| "No output tensor returned".to_string())?;

        let (shape, data) = output_tensor
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("Failed to extract output tensor: {}", e))?;

        // Shape is [1, 2, 256, 256]: the predicted a and b chroma planes.
        let out_h = shape[2] as u32;
        let out_w = shape[3] as u32;
        let plane = (out_w * out_h) as usize;

        let a_small: Vec<f32> = (0..plane).map(|i| data.get(i).copied().unwrap_or(0.0)).collect();
        let b_small: Vec<f32> = (0..plane)
            .map(|i| data.get(i + plane).copied().unwrap_or(0.0))
            .collect();

        let a_full = upsample_plane(&a_small, out_w, out_h, w, h);
        let b_full = upsample_plane(&b_small, out_w, out_h, w, h);

        let mut out_rgb = image::RgbImage::new(w, h);
        for y in 0..h {
            for x in 0..w {
                let l = orig_l[(y * w + x) as usize];
                let a = a_full[(y * w + x) as usize];
                let b = b_full[(y * w + x) as usize];
                let (r, g, bl) = lab_to_rgb(l, a, b);
                out_rgb.put_pixel(
                    x,
                    y,
                    image::Rgb([
                        (r * 255.0).round() as u8,
                        (g * 255.0).round() as u8,
                        (bl * 255.0).round() as u8,
                    ]),
                );
            }
        }

        if has_alpha {
            let src_rgba = img.to_rgba8();
            let mut out_rgba = RgbaImage::new(w, h);
            for y in 0..h {
                for x in 0..w {
                    let p = out_rgb.get_pixel(x, y);
                    let alpha = src_rgba.get_pixel(x, y)[3];
                    out_rgba.put_pixel(x, y, Rgba([p[0], p[1], p[2], alpha]));
                }
            }
            Ok(DynamicImage::ImageRgba8(out_rgba))
        } else {
            Ok(DynamicImage::ImageRgb8(out_rgb))
        }
    }
}
