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
