export interface ImageMetadata {
  width: u32;
  height: u32;
  format: string;
  file_size: number;
  has_alpha: boolean;
  exif_orientation?: number;
  camera_model?: string;
  date_taken?: string;
}

type u32 = number;

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeSettings {
  width?: number;
  height?: number;
  preserve_aspect_ratio: boolean;
  fit_mode?: string;
}

export type SupportedFormat = "webp" | "png" | "jpeg";

export interface ExportSettings {
  crop?: CropSettings;
  rotate?: number;
  flip_horizontal?: boolean;
  flip_vertical?: boolean;
  resize?: ResizeSettings;
  format: SupportedFormat;
  quality?: number;
  flatten_background?: string;
  strip_metadata: boolean;
  remove_background?: boolean;
  cutout_model?: CutoutModelType;
  upscale_scale?: 2 | 4;
  upscale_model?: UpscaleModelType;
}

export type UpscaleModelType = "realesrgan-x4plus" | "realesrgan-x4plus-anime";

export interface UpscaleModelInfo {
  id: UpscaleModelType;
  name: string;
  tag: string;
  size: string;
  description: string;
}

/// Ceiling on the long edge of an upscale result. Repeat passes feed their own
/// output back in, so without a stop the tile count and PNG buffer grow without
/// bound. A pass that would cross this is blocked in the UI before it runs.
export const UPSCALE_MAX_OUTPUT_DIM = 8000;

/// Long-edge cap applied to the source of a first upscale pass. Repeat passes
/// skip it so they build on the previous result's real pixels.
export const UPSCALE_FIRST_PASS_MAX_DIM = 1920;

/// Dimensions and cumulative scale of the upscale currently on the canvas.
export interface UpscaleResult {
  width: number;
  height: number;
  /// Combined multiplier across every pass so far, relative to the source image.
  factor: number;
}

export const UPSCALE_MODELS: UpscaleModelInfo[] = [
  {
    id: "realesrgan-x4plus",
    name: "Real-ESRGAN x4plus",
    tag: "Default · Photos",
    size: "~68.8 MB",
    description: "Trained on real-world degradation; ideal for photos, textures, and general images.",
  },
  {
    id: "realesrgan-x4plus-anime",
    name: "Real-ESRGAN Anime 6B",
    tag: "Anime · Art",
    size: "~18.4 MB",
    description: "Optimized 6-block architecture tailored for anime, manga, and digital 2D illustrations.",
  },
];

export type RestoreTaskType = "restore" | "denoise" | "deblur";

export type RestoreModelType =
  | "nafnet-reds"
  | "nafnet-gopro"
  | "nafnet-sidd"
  | "scunet-gan"
  | "scunet-psnr";

export interface RestoreTaskInfo {
  id: RestoreTaskType;
  label: string;
  description: string;
  defaultModel: RestoreModelType;
}

export const RESTORE_TASKS: RestoreTaskInfo[] = [
  {
    id: "restore",
    label: "Restore",
    description: "General cleanup for compression artifacts, banding, and worn detail.",
    defaultModel: "nafnet-reds",
  },
  {
    id: "denoise",
    label: "Denoise",
    description: "Removes sensor noise and grain while holding on to fine texture.",
    defaultModel: "scunet-gan",
  },
  {
    id: "deblur",
    label: "Deblur",
    description: "Recovers detail lost to motion blur and soft focus.",
    defaultModel: "nafnet-gopro",
  },
];

export interface RestoreModelInfo {
  id: RestoreModelType;
  task: RestoreTaskType;
  name: string;
  shortName: string;
  tag: string;
  size: string;
  description: string;
}

export const RESTORE_MODELS: RestoreModelInfo[] = [
  {
    id: "nafnet-reds",
    task: "restore",
    name: "NAFNet REDS",
    shortName: "NAFNet REDS",
    tag: "General",
    size: "~275 MB",
    description: "Trained on the REDS video restoration set. The best all-round choice when you are not sure what is wrong with the image.",
  },
  {
    id: "nafnet-gopro",
    task: "deblur",
    name: "NAFNet GoPro",
    shortName: "NAFNet GoPro",
    tag: "Motion blur",
    size: "~275 MB",
    description: "Trained on the GoPro deblurring set. Targets camera shake and motion smear rather than noise.",
  },
  {
    id: "scunet-gan",
    task: "denoise",
    name: "SCUNet GAN",
    shortName: "SCUNet GAN",
    tag: "Sharper",
    size: "~91 MB",
    description: "Perceptual denoising. Leans toward a crisp, natural-looking result and is the fastest model here.",
  },
  {
    id: "scunet-psnr",
    task: "denoise",
    name: "SCUNet PSNR",
    shortName: "SCUNet PSNR",
    tag: "Safer",
    size: "~91 MB",
    description: "Fidelity-tuned denoising. Softer output than the GAN variant, with less risk of invented detail.",
  },
  {
    id: "nafnet-sidd",
    task: "denoise",
    name: "NAFNet SIDD",
    shortName: "NAFNet SIDD",
    tag: "Heavy",
    size: "~468 MB",
    description: "Trained on real smartphone sensor noise. Strongest denoiser of the three, and the slowest.",
  },
];

export type EnhanceModelType = "iat-lol-v2" | "iat-lol-v1" | "iat-exposure";

export interface EnhanceModelInfo {
  id: EnhanceModelType;
  name: string;
  shortName: string;
  tag: string;
  size: string;
  description: string;
}

export const ENHANCE_MODELS: EnhanceModelInfo[] = [
  {
    id: "iat-lol-v2",
    name: "IAT Low Light V2",
    shortName: "Low Light V2",
    tag: "Default",
    size: "~0.4 MB",
    description: "Trained on LOL-V2. Lifts dark and underexposed photos while keeping colors natural. The best starting point for night and indoor shots.",
  },
  {
    id: "iat-lol-v1",
    name: "IAT Low Light V1",
    shortName: "Low Light V1",
    tag: "Alt",
    size: "~0.4 MB",
    description: "Trained on LOL-V1. An earlier low-light checkpoint that sometimes suits a photo better than V2. Worth trying when V2 overdoes it.",
  },
  {
    id: "iat-exposure",
    name: "IAT Exposure",
    shortName: "Exposure",
    tag: "Over / under",
    size: "~0.4 MB",
    description: "Trained on the Exposure Errors set. Corrects both blown-out and underexposed images rather than only brightening.",
  },
];

export interface ColorizeModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
}

export const COLORIZE_MODEL: ColorizeModelInfo = {
  id: "ddcolor",
  name: "DDColor",
  size: "~113 MB",
  description: "Predicts color for black-and-white photos. Lightness stays exactly as shot and only the color is generated, so detail and grain survive the pass.",
};

export type CutoutModelType = "rmbg-2.0" | "lucida-onnx" | "birefnet-hr" | "fey-nobg";

export interface CutoutModelInfo {
  id: CutoutModelType;
  name: string;
  shortName: string;
  tag?: string;
  size: string;
  resolution: string;
  isGated: boolean;
  description: string;
}

export const CUTOUT_MODELS: CutoutModelInfo[] = [
  {
    id: "rmbg-2.0",
    name: "RMBG 2.0 (Bria AI)",
    shortName: "RMBG 2.0",
    size: "~350 MB",
    resolution: "1024×1024",
    isGated: true,
    description: "BiRefNet architecture optimized for fine hair, delicate textures, and studio cutouts.",
  },
  {
    id: "lucida-onnx",
    name: "Lucida ONNX",
    shortName: "Lucida",
    size: "~932 MB",
    resolution: "1024×1024",
    isGated: false,
    description: "Fine-tuned BiRefNet HR for soft-alpha matting, transparency, illustration art, and edge detail.",
  },
  {
    id: "birefnet-hr",
    name: "BiRefNet HR Matting",
    shortName: "BiRefNet HR",
    size: "~932 MB",
    resolution: "2048×2048",
    isGated: false,
    description: "High-resolution dichotomous segmentation and matting at native 2048×2048 resolution.",
  },
  {
    id: "fey-nobg",
    name: "FeyNobg ONNX",
    shortName: "FeyNobg",
    size: "~1.1 GB",
    resolution: "1024×1024",
    isGated: false,
    description: "Production-tuned background removal for portraits, products, apparel, and graphics.",
  },
];

export interface ExportResult {
  output_path: string;
  width: number;
  height: number;
  original_size: number;
  output_size: number;
  saved_bytes: number;
  saved_percentage: number;
  duration_ms: number;
}

export type AspectRatioOption = {
  id: string;
  label: string;
  ratio: number | null; // null for freeform
  description?: string;
};

export const COMMON_ASPECT_RATIOS: AspectRatioOption[] = [
  { id: "free", label: "Freeform", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1, description: "Square (Profile, Etsy, Icon)" },
  { id: "16:9", label: "16:9", ratio: 16 / 9, description: "Landscape Video / Cover" },
  { id: "4:3", label: "4:3", ratio: 4 / 3, description: "Standard Monitor / Photo" },
  { id: "3:2", label: "3:2", ratio: 3 / 2, description: "Classic 35mm DSLR" },
  { id: "9:16", label: "9:16", ratio: 9 / 16, description: "Story / Vertical" },
  { id: "4:5", label: "4:5", ratio: 4 / 5, description: "Instagram Portrait" },
];

export interface PromptPoint {
  x: number; // normalized 0.0 .. 1.0
  y: number; // normalized 0.0 .. 1.0
  label: number; // 1 = include, 0 = exclude
}

export interface SamMaskResult {
  mask_data_url: string;
  score: number;
  bounds?: CropSettings | null;
}

export interface SamEffectSettings {
  effect: "cutout" | "blur" | "color_splash" | "adjustments" | "remove";
  blur_radius?: number;
  invert?: boolean;
  target?: "subject" | "background";
  brightness?: number;
  contrast?: number;
  saturation?: number;
}
