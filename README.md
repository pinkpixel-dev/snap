# Snap

<p align="center">
  <img src="icon.png" alt="Snap icon" width="300" height="300">
</p>

A little image toolbox.

Snap is a local-first desktop application built for editing and compressing images.

## Features

* **Quick input:** Drag and drop images right into the window, open via file browser, or paste directly from your clipboard.
* **Non-destructive crop & transforms:** Freeform cropping, aspect-ratio locks (1:1, 16:9, 4:3, 3:2, 9:16, 4:5), 90-degree rotations, and horizontal/vertical flips.
* **Precise resizing:** Scale by exact pixel dimensions or percentages with aspect-ratio locking and resampling.
* **Format conversion & compression:** Convert between WebP, PNG, and JPEG with live quality controls and before/after file size feedback.
* **On-device AI background removal:** Isolate subjects and create transparent cutouts locally using RMBG 2.0, Lucida ONNX, BiRefNet HR Matting (2048×2048), or FeyNobg ONNX, accelerated via NVIDIA CUDA GPU with automatic CPU fallback.
* **AI neural upscaling:** Enhance image resolution up to 4× using Real-ESRGAN with GPU acceleration and memory-bounded tiled processing.
* **Low-light and exposure correction:** Rescue dark or badly exposed photos with the Illumination Adaptive Transformer. Three checkpoints (LOL-V1, LOL-V2, and Exposure Errors) and each is under half a megabyte.
* **Black-and-white colorization:** Add color to old photos with DDColor. Only the color is predicted, so the original lightness, grain, and detail stay exactly as shot.
* **AI image restoration:** Repair noisy, blurry, and artifact-heavy images with NAFNet and SCUNet. Three tasks, each with its own model: general restore, denoise, and deblur. Runs on the same tiled, GPU-accelerated pipeline as upscaling.
* **Metadata privacy:** Inspect EXIF information and strip metadata with one click upon export.
* **Live comparison:** Toggle between your working edits and the original image in real time.
* **Safe exports:** Snap preserves your original image files and saves your edits to a separate destination.

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (version 18 or newer)
* [Rust](https://www.rust-lang.org/tools/install) and Cargo
* Linux build libraries (if on Linux): `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Installation & Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/pinkpixel-dev/snap.git
cd snap
npm install
```

Run Snap in desktop development mode:

```bash
npm run tauri dev
```

Build a release binary:

```bash
npm run tauri build
```

## Tech Stack

* **Desktop Shell:** Tauri v2
* **Backend Processing:** Rust with the `image` crate and ONNX Runtime (`ort`)
* **Frontend:** React 18, TypeScript, and Vanilla CSS

## License

Apache 2.0. See [LICENSE](LICENSE) for details. Built by [Pink Pixel](https://pinkpixel.dev).
