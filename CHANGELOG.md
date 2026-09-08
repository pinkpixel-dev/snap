# Changelog

All notable changes to Snap will be documented in this file.

## 0.9.0 - September 7, 2026

### ✨ Light & Exposure
* Added a Light tool that brightens dark photos and corrects bad exposure using the Illumination Adaptive Transformer, running locally with CUDA acceleration and CPU fallback.
* Added three IAT checkpoints: Low Light V2 (default), Low Light V1, and Exposure. Each is around 0.4 MB, so switching between them is effectively free.

### ✨ Colorize
* Added a Colorize tool that adds color to black-and-white photos with DDColor (~113 MB, downloaded on first use).
* Only chroma is predicted. The original lightness is kept at full resolution and recombined in Lab, so grain and detail survive the pass.
* Colorization feeds the model a neutral sRGB image rather than a raw lightness channel, and upsamples the predicted chroma with a sampler that does not clamp float values. Both were needed for the output to carry any color at all.

### 🎨 Interface
* Added Light and Colorize sidebar tabs, filling the 4-column 2-row tool grid.
* Both tools use the same before/after split preview, stack on the current result, and export from the already-processed buffer instead of re-running inference.

### 🧹 Maintenance
* `ModelSpec` now supports companion files, so ONNX external-data exports can fetch their sidecar `.onnx.data` weights alongside the graph.
* Extracted the shared model-tool panel layout into `AiToolPanel`, used by the two new panels.

### 🏷️ Versioning
* Bumped version to 0.9.0 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json.

## 0.8.0 - September 7, 2026

### ✨ Image Restoration
* Added a Restore tool that repairs noisy, blurry, and artifact-heavy images locally with NAFNet and SCUNet, using the same CUDA-accelerated ONNX pipeline as upscaling with automatic CPU fallback.
* Added a three-way task selector (Restore, Denoise, Deblur). Picking a task selects its default model and filters the model list to that task.
* Added five downloadable models from `deepghs/image_restoration`: NAFNet REDS (~275 MB), NAFNet GoPro (~275 MB), NAFNet SIDD (~468 MB), SCUNet GAN (~91 MB), and SCUNet PSNR (~91 MB). Each downloads on first use and is cached offline.
* Restoration passes stack. The run button stays available after a pass, so you can denoise a restored image or deblur a denoised one, and Revert to Original starts over from the source image.
* Restored images get the same draggable before/after split preview as upscaling, and chain into the upscaler when both are active.
* Exporting a restored image reuses the already-processed buffer instead of re-running inference.

### 🧹 Maintenance
* Extracted model download and cache handling into `src-tauri/src/pipeline/model_cache.rs`, shared by the upscale and restore engines.

### 🏷️ Versioning
* Bumped version to 0.8.0 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json. This also realigns Cargo.toml and tauri.conf.json, which had been left at 0.7.0 while package.json moved to 0.7.2.

## 0.7.2 - September 7, 2026

### 🐛 Fixes
* Fixed Smart Selection cutouts keeping a haze of the original background. The decoder mask was mapped through a sigmoid, so every slightly-negative background pixel kept some alpha instead of going fully transparent. The mask is now upsampled in logit space and thresholded at SAM's decision boundary with a narrow anti-aliased edge.

## 0.7.1 - September 7, 2026

### 🐛 Fixes
* Fixed the tool sidebar tab row overflowing its container, which clipped the BG Removal tab against the right edge. Tab columns now respect the sidebar width and icons no longer shrink.

## 0.7.0 - September 7, 2026

### ✨ Smart Selection
* Integrated Meta SlimSAM neural segmentation model (slimsam-77-uniform) for interactive point-and-click object masking on desktop and mobile.
* Added Include and Exclude prompt point placement directly on the preview canvas with real-time visual badges and animated selection boundary previews.
* Added native selective image adjustments including Subject Cutout, Portrait Background Blur, Color Splash, and Targeted Brightness, Contrast, and Saturation adjustments.
* Added dedicated Export Cutout action buttons to both Smart Selection and Background Removal panels, setting PNG format and opening the export modal directly.

### 🎨 Interface
* Reorganized the sidebar tool navigation into a 4-column 2-row grid to fit all tools comfortably without widening the side panel.
* Added descriptive accessibility titles and aria labels across all sidebar tool tabs.
* Removed the non-functioning Show in Folder action button from the Export Complete modal.

### 🏷️ Versioning
* Bumped version to 0.7.0 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json.

## 0.6.0 - September 7, 2026

### ⚡ Performance
* Eliminated 60-second export delay on images with background removal or upscaling by reusing processed in-memory image buffers instead of re-running CPU neural models from scratch.

### 🎨 Export Modal
* Added interactive Export Mode toggle allowing users to choose between Full (Lossless / 100% Quality) and Compressed file output.
* Added inline format selector (WebP, PNG, JPEG) directly to the Export Modal.
* Added interactive compression slider and quick presets (High 85%, Balanced 75%, Compact 55%) when in Compressed mode.
* Added interactive privacy toggle to switch between metadata stripping and preservation directly from the modal.

### 🏷️ Versioning
* Bumped version to 0.6.0 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json.

## 0.5.1 - September 7, 2026

### 🎨 Interface
* Removed gold and green model tags from background removal model buttons in the sidebar and Settings modal.
* Moved resolution indicators (1024×1024 / 2048×2048) to the top right of each model button for a cleaner layout.

### 🏷️ Versioning
* Bumped version to 0.5.1 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json.

## 0.5.0 - September 7, 2026

### ⚡ Performance
* Enabled hardware-accelerated CUDA GPU inference in ONNX Runtime for on-device background removal and neural upscaling.
* Configured silent CPU fallback so systems without an NVIDIA GPU or CUDA runtime continue operating smoothly without interruption.

### 🤖 Models
* Accelerated RMBG 2.0, Lucida ONNX, BiRefNet HR Matting (2048×2048), and FeyNobg ONNX segmentation on supported GPUs.
* Accelerated Real-ESRGAN x4plus and Real-ESRGAN Anime 6B super-resolution passes with memory-bounded tiled execution on GPU.

### 🏷️ Versioning
* Bumped version to 0.5.0 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json.

## 0.4.2 - September 7, 2026

### 🎨 Interface
* Added a collapsible sidebar toggle button to the canvas preview toolbar to easily hide or show the tool panel.
* Added keyboard shortcut support (`Ctrl+\` / `Cmd+\` and `Ctrl+B` / `Cmd+B`) to toggle the sidebar.
* Added automatic canvas refit calculation so collapsing the sidebar instantly expands the image to fill the entire workspace.

### 🏷️ Versioning
* Bumped version to 0.4.2 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json.

## 0.4.1 - September 7, 2026

### 🎨 Interface
* Widened right-side tool sidebar to 480px and optimized tab spacing so all tool tabs fit cleanly without clipping.
* Renamed "Cutout" tab in the tool sidebar to "BG Removal" for clearer feature naming.

### 🏷️ Versioning
* Bumped version to 0.4.1 across package.json, package-lock.json, Cargo.toml, and tauri.conf.json.

## 0.4.0 - September 7, 2026

### ✂️ Cutout
* Replaced generic BiRefNet with three specialized background removal and matting models: `PinkPixel/lucida-onnx` (~932 MB, 1024×1024), `PinkPixel/birefnet-hr-matting-onnx` (~932 MB, 2048×2048), and `PinkPixel/fey-nobg-onnx` (~1.1 GB, 1024×1024).
* Retained `rmbg-2.0` (Bria RMBG 2.0 INT8, ~350 MB) for authenticated studio cutouts.
* Upgraded the Rust inference pipeline with dynamic input resolution and tensor allocation, supporting native 2048×2048 processing for high-resolution matting alongside 1024×1024 models.
* Dynamic output mask extraction and triangle upsampling calibrated to match the native resolution of each model.

### 🎨 Interface
* Updated Cutout tool panel with a 2x2 grid displaying model name, resolution, download footprint, and gating status.
* Updated live processing feedback with dynamic resolution indicators.
* Clarified Hugging Face token guidance in Settings to distinguish public unauthenticated models from gated models.

### 🏷️ Versioning
* Bumped version to 0.4.0 across package.json, package-lock.json, and Cargo.toml.

## 0.3.0 - September 7, 2026

### ✨ Upscale
* Added offline neural super-resolution powered by Real-ESRGAN ONNX models and ONNX Runtime (`ort`).
* Added `Real-ESRGAN x4plus` (~68.8 MB) as the default model for photos and general images, and `Real-ESRGAN x4plus-anime-6B` (~18.4 MB) for anime, manga, and 2D illustrations.
* Added 2× and 4× scale factor options, with 2× generated using neural 4× inference downsampled via Lanczos3 for ultra-sharp edge definition.
* Implemented memory-bounded tiled inference (256×256 tiles with 16px padding) to eliminate boundary seams and prevent CPU memory spikes on large images.
* Added full transparency preservation for upscaled PNG and WebP images.

### 🎨 Interface
* Added dedicated Upscale tool panel in the sidebar with model architecture selector, scale multipliers, offline cache status, and live output dimension preview.
* Added interactive Before/After split comparison slider directly on the canvas preview, supporting pointer dragging, touch, and left/right keyboard navigation.
* Added comparison badges and quick hold-to-compare toggle.

### 🏷️ Versioning
* Bumped version to 0.3.0 across package.json, package-lock.json, and Cargo.toml.

## 0.2.1 - September 7, 2026

### ✂️ Cutout
* Switched default background removal model to `PinkPixel/inspyrenet-onnx` (`inspyrenet_swinb_1024.onnx`, ~357 MB) after the previous model was gated on Hugging Face.
* Updated download endpoints, candidate filename detection, and UI progress labels to reflect InSPyReNet Swin-B.

### 🐛 Fixes
* Disabled WebKitGTK DMA-BUF renderer by default on Linux (`WEBKIT_DISABLE_DMABUF_RENDERER=1`) to prevent immediate Wayland compositor crashes on NVIDIA hardware.

### 🏷️ Versioning
* Bumped version to 0.2.1 across package.json, package-lock.json, and Cargo.toml.

## 0.2.0 - September 7, 2026

### ✂️ Cutout
* Integrated native on-device background removal powered by Bria RMBG 2.0 (BiRefNet architecture, 1024x1024 resolution) and ONNX Runtime (`ort`).
* Automated on-demand model download for INT8 quantized weights (~350 MB) with local caching in the application data directory.
* Added 1024x1024 ImageNet tensor normalization, dual probability/logit mask extraction, and Lanczos3 edge upsampling.
* Integrated background removal toggle in the export pipeline for PNG, WebP, and matte-flattened JPEG.

### 🎨 Interface
* Added dedicated Cutout panel in the tool sidebar with device cache status, one-click processing, and progress indicators.
* Added instant checkerboard transparency visualization on the canvas preview upon background removal.
* Added restoration control to revert to the original background at any time.

### 🏷️ Versioning
* Bumped project version to 0.2.0 across root package.json, package-lock.json, and Cargo.toml.

## 0.1.0 - September 7, 2026

### 🚀 Initial Release
* Scaffolded Tauri v2 desktop application with React and TypeScript.
* Built the native Rust image processing pipeline supporting PNG, JPEG, and WebP.
* Added non-destructive interactive canvas crop, 90-degree rotation, and flipping.
* Implemented pixel-exact and percentage resizing with aspect-ratio locking.
* Added quality compression controls and real-time file size comparison.
* Implemented EXIF metadata inspection and one-click metadata stripping on export.
* Designed dark charcoal user interface with accessible controls and zero clutter.
