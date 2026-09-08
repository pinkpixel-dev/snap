use super::*;
use image::RgbaImage;

#[test]
fn test_crop_math() {
    let img = DynamicImage::ImageRgba8(RgbaImage::new(100, 100));
    let crop = CropSettings { x: 10, y: 10, width: 50, height: 40 };
    let cropped = Pipeline::apply_transforms(img, Some(&crop), None, None, None);
    assert_eq!(cropped.width(), 50);
    assert_eq!(cropped.height(), 40);
}

#[test]
fn test_rotate_90() {
    let img = DynamicImage::ImageRgba8(RgbaImage::new(100, 60));
    let rotated = Pipeline::apply_transforms(img, None, Some(90), None, None);
    assert_eq!(rotated.width(), 60);
    assert_eq!(rotated.height(), 100);
}

#[test]
fn test_resize_aspect_ratio() {
    let img = DynamicImage::ImageRgba8(RgbaImage::new(200, 100));
    let resize = ResizeSettings {
        width: Some(100),
        height: None,
        preserve_aspect_ratio: true,
        fit_mode: None,
    };
    let resized = Pipeline::apply_resize(img, Some(&resize));
    assert_eq!(resized.width(), 100);
    assert_eq!(resized.height(), 50);
}

#[test]
fn test_hex_color_parsing() {
    assert_eq!(Pipeline::parse_hex_color("#ffffff"), Some([255, 255, 255]));
    assert_eq!(Pipeline::parse_hex_color("#000"), Some([0, 0, 0]));
    assert_eq!(Pipeline::parse_hex_color("#3b82f6"), Some([59, 130, 246]));
}

#[test]
fn test_encode_png() {
    let img = DynamicImage::ImageRgba8(RgbaImage::new(50, 50));
    let (bytes, format) = Pipeline::encode_to_bytes(&img, "png", None, None).unwrap();
    assert_eq!(format, "png");
    assert!(!bytes.is_empty());
    let decoded = image::load_from_memory(&bytes).unwrap();
    assert_eq!(decoded.width(), 50);
    assert_eq!(decoded.height(), 50);
}

#[test]
fn test_encode_jpeg_flattening() {
    let mut rgba = RgbaImage::new(40, 40);
    rgba.put_pixel(0, 0, image::Rgba([255, 0, 0, 128]));
    let img = DynamicImage::ImageRgba8(rgba);
    let (bytes, format) = Pipeline::encode_to_bytes(&img, "jpeg", Some(90), Some("#ffffff")).unwrap();
    assert_eq!(format, "jpeg");
    assert!(!bytes.is_empty());
    let decoded = image::load_from_memory(&bytes).unwrap();
    assert_eq!(decoded.width(), 40);
    assert_eq!(decoded.height(), 40);
}

#[test]
fn test_encode_webp() {
    let img = DynamicImage::ImageRgba8(RgbaImage::new(64, 64));
    let (bytes, format) = Pipeline::encode_to_bytes(&img, "webp", Some(80), None).unwrap();
    assert_eq!(format, "webp");
    assert!(!bytes.is_empty());
    let decoded = image::load_from_memory(&bytes).unwrap();
    assert_eq!(decoded.width(), 64);
    assert_eq!(decoded.height(), 64);
}

#[test]
fn test_load_image_data_url() {
    let img = DynamicImage::ImageRgba8(RgbaImage::new(32, 32));
    let (bytes, _) = Pipeline::encode_to_bytes(&img, "png", None, None).unwrap();
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
    let data_url = format!("data:image/png;base64,{}", b64);
    let loaded = Pipeline::load_image(&data_url).unwrap();
    assert_eq!(loaded.width(), 32);
    assert_eq!(loaded.height(), 32);
}

#[test]
fn test_cutout_model_specs() {
    let rmbg = cutout::CutoutEngine::get_spec(Some("rmbg-2.0"));
    assert_eq!(rmbg.id, "rmbg-2.0");
    assert_eq!(rmbg.filename, "rmbg-2.0-int8.onnx");
    assert_eq!(rmbg.resolution, (1024, 1024));

    let lucida = cutout::CutoutEngine::get_spec(Some("lucida-onnx"));
    assert_eq!(lucida.id, "lucida-onnx");
    assert_eq!(lucida.filename, "lucida.onnx");
    assert_eq!(lucida.resolution, (1024, 1024));

    let biref_hr = cutout::CutoutEngine::get_spec(Some("birefnet-hr"));
    assert_eq!(biref_hr.id, "birefnet-hr");
    assert_eq!(biref_hr.filename, "birefnet-hr-matting.onnx");
    assert_eq!(biref_hr.resolution, (2048, 2048));

    let fey = cutout::CutoutEngine::get_spec(Some("fey-nobg"));
    assert_eq!(fey.id, "fey-nobg");
    assert_eq!(fey.filename, "fey-nobg.onnx");
    assert_eq!(fey.resolution, (1024, 1024));

    let default_spec = cutout::CutoutEngine::get_spec(None);
    assert_eq!(default_spec.id, "rmbg-2.0");
}

#[test]
fn test_upscale_model_specs() {
    let x4plus = upscale::UpscaleEngine::get_spec(Some("realesrgan-x4plus"));
    assert_eq!(x4plus.id, "realesrgan-x4plus");
    assert_eq!(x4plus.filename, "RealESRGAN_x4plus.onnx");

    let anime = upscale::UpscaleEngine::get_spec(Some("realesrgan-x4plus-anime"));
    assert_eq!(anime.id, "realesrgan-x4plus-anime");
    assert_eq!(anime.filename, "RealESRGAN_x4plus_anime_6B.onnx");

    let default_spec = upscale::UpscaleEngine::get_spec(None);
    assert_eq!(default_spec.id, "realesrgan-x4plus");
}

#[test]
fn test_export_settings_upscale() {
    let json_str = r#"{
        "format": "png",
        "strip_metadata": true,
        "upscale_scale": 2,
        "upscale_model": "realesrgan-x4plus"
    }"#;
    let settings: ExportSettings = serde_json::from_str(json_str).unwrap();
    assert_eq!(settings.upscale_scale, Some(2));
    assert_eq!(settings.upscale_model.as_deref(), Some("realesrgan-x4plus"));
}

#[test]
fn test_cuda_availability_check() {
    let _available = Pipeline::is_cuda_available();
}

#[test]
fn test_sam_model_filenames() {
    assert_eq!(sam::ENCODER_FILENAME, "slimsam-encoder-quantized.onnx");
    assert_eq!(sam::DECODER_FILENAME, "slimsam-decoder-quantized.onnx");
}

#[test]
fn test_sam_effect_cutout() {
    use image::{DynamicImage, GrayImage, Luma, Rgba, RgbaImage};
    let mut img = RgbaImage::new(10, 10);
    for p in img.pixels_mut() {
        *p = Rgba([255, 0, 0, 255]);
    }
    let mut mask = GrayImage::new(10, 10);
    // Left half foreground, right half background
    for y in 0..10 {
        for x in 0..5 {
            mask.put_pixel(x, y, Luma([255]));
        }
    }
    let settings = crate::models::SamEffectSettings {
        effect: "cutout".to_string(),
        blur_radius: None,
        invert: None,
        target: None,
        brightness: None,
        contrast: None,
        saturation: None,
    };
    let res = sam::SamEngine::apply_effect(&DynamicImage::ImageRgba8(img), &mask, &settings).unwrap();
    let res_rgba = res.to_rgba8();
    assert_eq!(res_rgba.get_pixel(2, 2)[3], 255); // foreground alpha intact
    assert_eq!(res_rgba.get_pixel(7, 7)[3], 0);   // background alpha cut
}

#[test]
fn test_sam_effect_color_splash() {
    use image::{DynamicImage, GrayImage, Luma, Rgba, RgbaImage};
    let mut img = RgbaImage::new(10, 10);
    for p in img.pixels_mut() {
        *p = Rgba([255, 0, 0, 255]); // pure red
    }
    let mut mask = GrayImage::new(10, 10);
    // Left half foreground (color), right half background (grayscale)
    for y in 0..10 {
        for x in 0..5 {
            mask.put_pixel(x, y, Luma([255]));
        }
    }
    let settings = crate::models::SamEffectSettings {
        effect: "color_splash".to_string(),
        blur_radius: None,
        invert: None,
        target: None,
        brightness: None,
        contrast: None,
        saturation: None,
    };
    let res = sam::SamEngine::apply_effect(&DynamicImage::ImageRgba8(img), &mask, &settings).unwrap();
    let res_rgba = res.to_rgba8();
    // Left side should remain pure red [255, 0, 0]
    let left_px = res_rgba.get_pixel(2, 2);
    assert_eq!(left_px[0], 255);
    assert_eq!(left_px[1], 0);
    // Right side should be grayscale: r == g == b (0.299 * 255 = 76)
    let right_px = res_rgba.get_pixel(7, 7);
    assert_eq!(right_px[0], right_px[1]);
    assert_eq!(right_px[1], right_px[2]);
}

#[test]
fn test_sam_effect_blur() {
    use image::{DynamicImage, GrayImage, Luma, Rgba, RgbaImage};
    let mut img = RgbaImage::new(20, 20);
    for (x, y, p) in img.enumerate_pixels_mut() {
        *p = if (x + y) % 2 == 0 { Rgba([255, 255, 255, 255]) } else { Rgba([0, 0, 0, 255]) };
    }
    let mut mask = GrayImage::new(20, 20);
    // Upper half foreground (sharp), lower half background (blurred)
    for y in 0..10 {
        for x in 0..20 {
            mask.put_pixel(x, y, Luma([255]));
        }
    }
    let settings = crate::models::SamEffectSettings {
        effect: "blur".to_string(),
        blur_radius: Some(5.0),
        invert: None,
        target: None,
        brightness: None,
        contrast: None,
        saturation: None,
    };
    let res = sam::SamEngine::apply_effect(&DynamicImage::ImageRgba8(img), &mask, &settings).unwrap();
    assert_eq!(res.width(), 20);
    assert_eq!(res.height(), 20);
}

#[test]
fn test_sam_inference_end_to_end() {
    if !sam::SamEngine::is_model_ready() {
        eprintln!("SlimSAM models not downloaded; skipping live inference test");
        return;
    }
    use image::{DynamicImage, Rgba, RgbaImage};
    let mut img = RgbaImage::new(100, 100);
    // Draw a bright red circle in the center
    for y in 0..100 {
        for x in 0..100 {
            let dx = x as i32 - 50;
            let dy = y as i32 - 50;
            if dx * dx + dy * dy < 25 * 25 {
                img.put_pixel(x, y, Rgba([255, 30, 30, 255]));
            } else {
                img.put_pixel(x, y, Rgba([20, 20, 20, 255]));
            }
        }
    }
    let dyn_img = DynamicImage::ImageRgba8(img);
    let mut cached = sam::SamEngine::encode_image(&dyn_img, "test_circle").expect("encode_image failed");
    assert_eq!(cached.orig_w, 100);
    assert_eq!(cached.orig_h, 100);

    // Prompt point at center (x: 0.5, y: 0.5, label: 1)
    let points = vec![crate::models::PromptPoint {
        x: 0.5,
        y: 0.5,
        label: 1,
    }];
    let mask_res = sam::SamEngine::decode_mask(&mut cached, &points).expect("decode_mask failed");
    assert!(mask_res.score > 0.0, "Score should be positive: {}", mask_res.score);
    assert!(!mask_res.mask_data_url.is_empty(), "Mask data URL should not be empty");
    assert!(cached.last_mask.is_some(), "Last mask should be cached");
    let mask = cached.last_mask.as_ref().unwrap();
    assert_eq!(mask.width(), 100);
    assert_eq!(mask.height(), 100);

    // The center should be selected
    let center_val = mask.get_pixel(50, 50)[0];
    assert!(center_val > 100, "Center pixel should be segmented: {}", center_val);
}
