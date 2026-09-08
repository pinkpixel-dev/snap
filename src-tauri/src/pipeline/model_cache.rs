use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use directories::ProjectDirs;

/// Describes one downloadable ONNX model and how a valid cached copy is recognized.
pub struct ModelSpec {
    pub id: &'static str,
    pub filename: &'static str,
    pub primary_url: &'static str,
    pub fallback_url: Option<&'static str>,
    pub candidates: &'static [&'static str],
    pub min_size: u64,
    /// Sidecar files that must sit next to the model, as (filename, url) pairs.
    /// ONNX external-data exports keep their weights in a separate `.onnx.data`
    /// file that the runtime resolves relative to the model path.
    pub companions: &'static [(&'static str, &'static str)],
}

/// Shared on-disk cache directory for every downloaded model.
pub fn models_dir() -> Result<PathBuf, String> {
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

/// Resolves an existing cached file for the spec, falling back to the canonical target path.
pub fn model_path(spec: &ModelSpec) -> Result<PathBuf, String> {
    let dir = models_dir()?;

    for name in spec.candidates {
        let p = dir.join(name);
        if p.exists() {
            if let Ok(meta) = fs::metadata(&p) {
                if meta.len() > spec.min_size {
                    return Ok(p);
                }
            }
        }
    }

    Ok(dir.join(spec.filename))
}

pub fn is_model_ready(spec: &ModelSpec) -> bool {
    let Ok(path) = model_path(spec) else { return false };
    if !path.exists() {
        return false;
    }
    match fs::metadata(&path) {
        Ok(meta) if meta.len() > spec.min_size => {}
        _ => return false,
    }

    let Ok(dir) = models_dir() else { return false };
    spec.companions.iter().all(|(name, _)| {
        fs::metadata(dir.join(name)).map(|m| m.len() > 0).unwrap_or(false)
    })
}

fn download_stream(url: &str, target_path: &Path) -> Result<(), String> {
    let temp_path = target_path.with_extension("tmp");

    let response = ureq::get(url)
        .call()
        .map_err(|e| format!("Download network error: {}", e))?;
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

/// Returns the cached model path, downloading it (primary URL, then fallback mirror) if missing.
pub fn ensure_model(spec: &ModelSpec) -> Result<PathBuf, String> {
    let target_path = model_path(spec)?;

    if is_model_ready(spec) {
        return Ok(target_path);
    }

    ensure_companions(spec)?;

    if target_path.exists() {
        if let Ok(meta) = fs::metadata(&target_path) {
            if meta.len() > spec.min_size {
                return Ok(target_path);
            }
        }
    }

    let primary_result = download_stream(spec.primary_url, &target_path);
    if primary_result.is_ok() {
        return Ok(target_path);
    }

    if let Some(fallback_url) = spec.fallback_url {
        if download_stream(fallback_url, &target_path).is_ok() {
            return Ok(target_path);
        }
    }

    primary_result.map(|_| target_path)
}

/// Downloads any sidecar weight files the model needs before the model itself loads.
fn ensure_companions(spec: &ModelSpec) -> Result<(), String> {
    if spec.companions.is_empty() {
        return Ok(());
    }

    let dir = models_dir()?;
    for (name, url) in spec.companions {
        let path = dir.join(name);
        if fs::metadata(&path).map(|m| m.len() > 0).unwrap_or(false) {
            continue;
        }
        download_stream(url, &path)
            .map_err(|e| format!("Failed to download companion file {}: {}", name, e))?;
    }

    Ok(())
}

