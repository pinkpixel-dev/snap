# Changelog

All notable changes to Snap will be documented in this file.

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
