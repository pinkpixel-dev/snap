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
  effect: "cutout" | "blur" | "color_splash" | "adjustments";
  blur_radius?: number;
  invert?: boolean;
  target?: "subject" | "background";
  brightness?: number;
  contrast?: number;
  saturation?: number;
}
