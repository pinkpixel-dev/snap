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

#[test]
fn test_sam_mask_background_is_fully_transparent() {
    if !sam::SamEngine::is_model_ready() {
        eprintln!("SlimSAM models not downloaded; skipping mask threshold test");
        return;
    }
    use image::{DynamicImage, Rgba, RgbaImage};
    let (w, h) = (300u32, 340u32);
    let radius = 90i32;
    let (cx, cy) = (150i32, 170i32);
    let mut img = RgbaImage::new(w, h);
    for y in 0..h {
        for x in 0..w {
            let dx = x as i32 - cx;
            let dy = y as i32 - cy;
            if dx * dx + dy * dy < radius * radius {
                img.put_pixel(x, y, Rgba([15, 15, 18, 255]));
            } else {
                img.put_pixel(x, y, Rgba([40, 220, 40, 255]));
            }
        }
    }

    let mut cached = sam::SamEngine::encode_image(&DynamicImage::ImageRgba8(img), "threshold_test")
        .expect("encode_image failed");
    let points = vec![crate::models::PromptPoint { x: 0.5, y: 0.5, label: 1 }];
    sam::SamEngine::decode_mask(&mut cached, &points).expect("decode_mask failed");
    let mask = cached.last_mask.as_ref().unwrap();

    // Well outside the subject the mask must be exactly zero. Mapping the decoder
    // logits through a plain sigmoid instead of thresholding leaves a few units of
    // alpha here, which shows up as the original background hazing through a cutout.
    let margin = radius + 25;
    let mut leaked = 0u32;
    for y in 0..h {
        for x in 0..w {
            let dx = x as i32 - cx;
            let dy = y as i32 - cy;
            if dx * dx + dy * dy > margin * margin && mask.get_pixel(x, y)[0] != 0 {
                leaked += 1;
            }
        }
    }
    assert_eq!(leaked, 0, "background pixels retained alpha: {}", leaked);

    // The subject must still be fully opaque, not just partially selected.
    assert_eq!(mask.get_pixel(cx as u32, cy as u32)[0], 255);
}

#[test]
fn test_restore_model_specs() {
    let reds = restore::RestoreEngine::get_model(Some("nafnet-reds"));
    assert_eq!(reds.spec.id, "nafnet-reds");
    assert_eq!(reds.spec.filename, "NAFNet-REDS-width64.onnx");
    assert_eq!(reds.tile_size, 256);

    let gopro = restore::RestoreEngine::get_model(Some("nafnet-gopro"));
    assert_eq!(gopro.spec.id, "nafnet-gopro");
    assert_eq!(gopro.spec.filename, "NAFNet-GoPro-width64.onnx");

    let sidd = restore::RestoreEngine::get_model(Some("nafnet-sidd"));
    assert_eq!(sidd.spec.id, "nafnet-sidd");
    assert_eq!(sidd.spec.filename, "NAFNet-SIDD-width64.onnx");

    let gan = restore::RestoreEngine::get_model(Some("scunet-gan"));
    assert_eq!(gan.spec.id, "scunet-gan");
    assert_eq!(gan.spec.filename, "SCUNet-GAN.onnx");
    assert_eq!(gan.tile_size, 128);

    let psnr = restore::RestoreEngine::get_model(Some("scunet-psnr"));
    assert_eq!(psnr.spec.id, "scunet-psnr");
    assert_eq!(psnr.spec.filename, "SCUNet-PSNR.onnx");

    let default_model = restore::RestoreEngine::get_model(None);
    assert_eq!(default_model.spec.id, "nafnet-reds");
}

/// Real inference against a cached model. Ignored by default because it needs the
/// SCUNet weights on disk; run with `cargo test -- --ignored restore_scunet_roundtrip`.
#[test]
#[ignore]
fn restore_scunet_roundtrip() {
    if !restore::RestoreEngine::is_model_ready(Some("scunet-gan")) {
        panic!("SCUNet-GAN.onnx is not cached; download it before running this test");
    }

    // Non-multiple-of-32 dimensions on purpose, and larger than one 128px tile,
    // so both the padding path and the tiling path are exercised.
    let mut src = image::RgbaImage::new(200, 150);
    for (x, y, px) in src.enumerate_pixels_mut() {
        let noise = ((x * 7 + y * 13) % 61) as u8;
        *px = image::Rgba([(x % 256) as u8, (y % 256) as u8, noise, 128]);
    }
    let input = image::DynamicImage::ImageRgba8(src.clone());

    let out = restore::RestoreEngine::restore(&input, Some("scunet-gan")).expect("restore failed");
    assert_eq!(out.dimensions(), (200, 150));

    // Alpha must survive untouched, and the RGB must actually have changed.
    let out_rgba = out.to_rgba8();
    assert!(out_rgba.pixels().all(|p| p[3] == 128));
    assert!(out_rgba.pixels().zip(src.pixels()).any(|(a, b)| a[0] != b[0] || a[1] != b[1] || a[2] != b[2]));
}

/// Same real-inference check for the NAFNet architecture, which pads to a
/// different multiple than SCUNet. Ignored by default; needs cached weights.
#[test]
#[ignore]
fn restore_nafnet_roundtrip() {
    if !restore::RestoreEngine::is_model_ready(Some("nafnet-reds")) {
        panic!("NAFNet-REDS-width64.onnx is not cached; download it before running this test");
    }

    let mut src = image::RgbImage::new(300, 210);
    for (x, y, px) in src.enumerate_pixels_mut() {
        let noise = ((x * 11 + y * 5) % 47) as u8;
        *px = image::Rgb([(x % 256) as u8, (y % 256) as u8, noise]);
    }
    let input = image::DynamicImage::ImageRgb8(src);

    let out = restore::RestoreEngine::restore(&input, Some("nafnet-reds")).expect("restore failed");
    assert_eq!(out.dimensions(), (300, 210));
}

#[test]
fn test_enhance_model_specs() {
    let v2 = enhance::EnhanceEngine::get_spec(Some("iat-lol-v2"));
    assert_eq!(v2.id, "iat-lol-v2");
    assert_eq!(v2.filename, "iat_lol_v2.onnx");
    assert_eq!(v2.companions.len(), 1);
    assert_eq!(v2.companions[0].0, "iat_lol_v2.onnx.data");

    let v1 = enhance::EnhanceEngine::get_spec(Some("iat-lol-v1"));
    assert_eq!(v1.id, "iat-lol-v1");

    let exposure = enhance::EnhanceEngine::get_spec(Some("iat-exposure"));
    assert_eq!(exposure.id, "iat-exposure");

    assert_eq!(enhance::EnhanceEngine::get_spec(None).id, "iat-lol-v2");
    assert_eq!(colorize::ColorizeEngine::get_spec().id, "ddcolor");
}

/// IAT is an external-data export, so this also proves the companion `.onnx.data`
/// file is found next to the graph. Ignored by default; needs cached weights.
#[test]
#[ignore]
fn enhance_iat_roundtrip() {
    if !enhance::EnhanceEngine::is_model_ready(Some("iat-lol-v2")) {
        panic!("iat_lol_v2.onnx is not cached; download it before running this test");
    }

    // A deliberately dark image, which is what the low-light model is for.
    let mut src = image::RgbaImage::new(240, 180);
    for (x, y, px) in src.enumerate_pixels_mut() {
        let v = (((x + y) % 40) / 2) as u8;
        *px = image::Rgba([v, v.saturating_add(3), v.saturating_add(6), 200]);
    }
    let input = image::DynamicImage::ImageRgba8(src.clone());

    let out = enhance::EnhanceEngine::enhance(&input, Some("iat-lol-v2")).expect("enhance failed");
    assert_eq!(out.dimensions(), (240, 180));

    let out_rgba = out.to_rgba8();
    assert!(out_rgba.pixels().all(|p| p[3] == 200));

    // The whole point is that the result is brighter than the input.
    let mean = |img: &image::RgbaImage| -> f64 {
        let sum: f64 = img.pixels().map(|p| (p[0] as f64 + p[1] as f64 + p[2] as f64) / 3.0).sum();
        sum / img.pixels().len() as f64
    };
    assert!(mean(&out_rgba) > mean(&src), "enhanced image should be brighter than the dark source");
}

/// Real DDColor inference plus the Lab round trip. Ignored by default.
#[test]
#[ignore]
fn colorize_ddcolor_roundtrip() {
    if !colorize::ColorizeEngine::is_model_ready() {
        panic!("ddcolor-fp16.onnx is not cached; download it before running this test");
    }

    // Greyscale content at a non-square, non-256 size.
    let mut src = image::RgbImage::new(320, 200);
    for (x, y, px) in src.enumerate_pixels_mut() {
        let v = (((x / 4 + y / 6) % 200) + 30) as u8;
        *px = image::Rgb([v, v, v]);
    }
    let input = image::DynamicImage::ImageRgb8(src.clone());

    let out = colorize::ColorizeEngine::colorize(&input).expect("colorize failed");
    assert_eq!(out.dimensions(), (320, 200));

    // Colorization must introduce chroma the greyscale source did not have, and
    // enough of it to actually see. A wrongly scaled model input still produces a
    // few off-by-one channel values, so a bare "not identical" check passes while
    // the picture stays grey.
    let out_rgb = out.to_rgb8();
    let peak_spread = out_rgb
        .pixels()
        .map(|p| {
            let max = p[0].max(p[1]).max(p[2]) as i32;
            let min = p[0].min(p[1]).min(p[2]) as i32;
            max - min
        })
        .max()
        .unwrap_or(0);
    assert!(
        peak_spread > 8,
        "colorized output is still effectively greyscale (peak channel spread {})",
        peak_spread
    );
}

/// The model input is a neutral sRGB image in 0..1, not a raw 0..100 lightness
/// channel. Getting this wrong is silent: inference succeeds and returns almost
/// no chroma, so the check is on the construction itself.
#[test]
fn test_colorize_input_is_neutral_srgb() {
    for (r, g, b) in [(0u8, 0u8, 0u8), (40, 90, 200), (255, 255, 255), (130, 130, 130)] {
        let (rf, gf, bf) = (r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0);
        let (l, _, _) = colorize::rgb_to_lab(rf, gf, bf);
        let (nr, ng, nb) = colorize::lab_to_rgb(l, 0.0, 0.0);

        assert!((0.0..=1.0).contains(&nr), "model input must stay in 0..1, got {}", nr);
        assert!((nr - ng).abs() < 0.002 && (ng - nb).abs() < 0.002, "input must be neutral grey");

        // Zeroing the chroma must not disturb the lightness it carries.
        let (l_back, a_back, b_back) = colorize::rgb_to_lab(nr, ng, nb);
        assert!((l_back - l).abs() < 0.05, "lightness drifted: {} vs {}", l_back, l);
        assert!(a_back.abs() < 0.02 && b_back.abs() < 0.02);
    }
}

/// The Lab helpers are the risky part of colorization, so they get a direct check.
#[test]
fn test_lab_round_trip_preserves_color() {
    for (r, g, b) in [(0u8, 0u8, 0u8), (255, 255, 255), (128, 64, 200), (10, 200, 90), (245, 130, 30)] {
        let (rf, gf, bf) = (r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0);
        let (l, a, bb) = colorize::rgb_to_lab(rf, gf, bf);
        let (r2, g2, b2) = colorize::lab_to_rgb(l, a, bb);
        assert!((r2 - rf).abs() < 0.005, "red drifted for {:?}: {} vs {}", (r, g, b), r2, rf);
        assert!((g2 - gf).abs() < 0.005, "green drifted for {:?}", (r, g, b));
        assert!((b2 - bf).abs() < 0.005, "blue drifted for {:?}", (r, g, b));
    }

    // Neutral greys must land on L only, with no chroma.
    let (l, a, b) = colorize::rgb_to_lab(0.5, 0.5, 0.5);
    assert!(a.abs() < 0.01 && b.abs() < 0.01, "grey should have no chroma, got a={} b={}", a, b);
    assert!(l > 45.0 && l < 60.0, "mid grey lightness out of range: {}", l);
}

/// Chroma planes carry values far outside 0..1, and the obvious image-crate
/// resize clamps them away. This pins the sampler that replaced it.
#[test]
fn test_chroma_upsample_keeps_out_of_range_values() {
    let src = vec![-45.0f32, 60.0, 12.0, -80.0];
    let out = colorize::upsample_plane(&src, 2, 2, 8, 8);

    assert_eq!(out.len(), 64);

    let min = out.iter().cloned().fold(f32::INFINITY, f32::min);
    let max = out.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    assert!(min < -40.0, "negative chroma was clipped away, min was {}", min);
    assert!(max > 50.0, "large chroma was clipped away, max was {}", max);

    // Corners keep their source values, so the plane is not shifted.
    assert!((out[0] - (-45.0)).abs() < 0.001, "top-left corner drifted: {}", out[0]);
    assert!((out[63] - (-80.0)).abs() < 0.001, "bottom-right corner drifted: {}", out[63]);
}


#[test]
fn test_lama_dilate_grows_mask() {
    let mut mask = image::GrayImage::new(40, 40);
    mask.put_pixel(20, 20, image::Luma([255]));

    let grown = lama::dilate(&mask, 3);
    assert_eq!(grown.get_pixel(20, 20)[0], 255, "Original pixel should survive");
    assert_eq!(grown.get_pixel(23, 20)[0], 255, "Should reach the dilation radius");
    assert_eq!(grown.get_pixel(20, 17)[0], 255, "Should grow vertically too");
    assert_eq!(grown.get_pixel(25, 20)[0], 0, "Should stop past the radius");
}

#[test]
fn test_lama_mask_bounds() {
    let mut mask = image::GrayImage::new(30, 30);
    assert!(lama::mask_bounds(&mask).is_none(), "Empty mask has no bounds");

    mask.put_pixel(5, 7, image::Luma([255]));
    mask.put_pixel(11, 20, image::Luma([255]));
    assert_eq!(lama::mask_bounds(&mask), Some((5, 7, 7, 14)));
}

#[test]
fn test_lama_context_window_covers_mask_and_stays_in_bounds() {
    // A small hole gets a window bigger than itself, still inside the image.
    let (x, y, w, h) = lama::context_window(800, 600, (300, 250, 40, 30));
    assert_eq!(w, h, "Window should be square");
    assert!(x + w <= 800 && y + h <= 600, "Window must stay inside the image");
    assert!(x <= 300 && y <= 250, "Window must start at or before the mask");
    assert!(x + w >= 340 && y + h >= 280, "Window must contain the whole mask");

    // A mask against the edge cannot push the window off the image.
    let (x, y, w, h) = lama::context_window(200, 200, (0, 0, 190, 190));
    assert!(x + w <= 200 && y + h <= 200);
}

#[test]
fn test_lama_inpaint_end_to_end() {
    if !lama::LamaEngine::is_model_ready() {
        eprintln!("LaMa model not downloaded; skipping live inpainting test");
        return;
    }
    use image::{DynamicImage, Rgba, RgbaImage};

    // A striped background with a flat magenta block sitting on top of it.
    let mut img = RgbaImage::new(256, 256);
    for y in 0..256u32 {
        for x in 0..256u32 {
            let v = if (x / 8 + y / 8) % 2 == 0 { 180 } else { 120 };
            img.put_pixel(x, y, Rgba([v, v, (v as u32 * 3 / 4) as u8, 255]));
        }
    }
    let mut mask = image::GrayImage::new(256, 256);
    for y in 100..150u32 {
        for x in 100..150u32 {
            img.put_pixel(x, y, Rgba([255, 0, 255, 255]));
            mask.put_pixel(x, y, image::Luma([255]));
        }
    }

    let src = DynamicImage::ImageRgba8(img);
    let out = lama::LamaEngine::inpaint(&src, &mask, false).expect("inpaint failed");
    assert_eq!(out.dimensions(), (256, 256), "Result keeps the source size");

    let out_rgba = out.to_rgba8();
    let src_rgba = src.to_rgba8();

    // The magenta block should be gone from the middle of the masked area.
    let filled = out_rgba.get_pixel(125, 125);
    assert!(
        !(filled[0] > 200 && filled[1] < 60 && filled[2] > 200),
        "Masked object should have been painted over, got {:?}",
        filled
    );

    // A corner far from the mask must come back untouched.
    assert_eq!(
        out_rgba.get_pixel(5, 5),
        src_rgba.get_pixel(5, 5),
        "Pixels outside the mask must be preserved exactly"
    );
    assert_eq!(out_rgba.get_pixel(125, 125)[3], 255, "Alpha is carried over");
}
