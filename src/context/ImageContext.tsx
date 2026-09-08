import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ImageMetadata,
  CropSettings,
  ExportSettings,
  ExportResult,
  SupportedFormat,
  COMMON_ASPECT_RATIOS,
  CutoutModelType,
  CUTOUT_MODELS,
  UpscaleModelType,
} from "../types/image";

interface ImageContextType {
  // Image Source
  imagePath: string | null;
  imageName: string | null;
  imageDataUrl: string | null;
  metadata: ImageMetadata | null;
  isLoading: boolean;
  error: string | null;

  // Edit State
  crop: CropSettings | null;
  aspectRatioMode: string;
  rotate: number;
  flipH: boolean;
  flipV: boolean;
  resizeWidth: number;
  resizeHeight: number;
  aspectRatioLocked: boolean;
  fitMode: string;
  format: SupportedFormat;
  quality: number;
  flattenBg: string;
  stripMetadata: boolean;

  // View State
  activeTab: "crop" | "resize" | "upscale" | "cutout";
  setActiveTab: (tab: "crop" | "resize" | "upscale" | "cutout") => void;
  showCheckerboard: boolean;
  setShowCheckerboard: (val: boolean | ((prev: boolean) => boolean)) => void;
  showBeforeAfter: boolean;
  setShowBeforeAfter: (val: boolean | ((prev: boolean) => boolean)) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;

  // Cutout State
  isCutoutActive: boolean;
  isCutoutLoading: boolean;
  cutoutProgress: string | null;
  cutoutDataUrl: string | null;
  isModelReady: boolean;
  cutoutModel: CutoutModelType;
  setCutoutModel: (model: CutoutModelType) => void;
  hfToken: string;
  setHfToken: (token: string) => void;
  checkModelStatus: (modelId?: CutoutModelType) => Promise<boolean>;
  applyBackgroundRemoval: () => Promise<void>;
  restoreBackground: () => void;

  // Upscale State
  isUpscaleActive: boolean;
  isUpscaleLoading: boolean;
  upscaleProgress: string | null;
  upscaleDataUrl: string | null;
  isUpscaleModelReady: boolean;
  upscaleModel: UpscaleModelType;
  setUpscaleModel: (model: UpscaleModelType) => void;
  upscaleScale: 2 | 4;
  setUpscaleScale: (scale: 2 | 4) => void;
  splitSliderPos: number;
  setSplitSliderPos: (pos: number | ((prev: number) => number)) => void;
  checkUpscaleModelStatus: (modelId?: UpscaleModelType) => Promise<boolean>;
  applyUpscale: () => Promise<void>;
  restoreUpscale: () => void;

  // Settings State
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  // Export State
  isExporting: boolean;
  exportResult: ExportResult | null;
  isExportModalOpen: boolean;
  openExportModal: () => void;
  closeExportModal: () => void;
  clearExportResult: () => void;

  // Actions
  loadImageFromPath: (path: string) => Promise<void>;
  loadImageFromDataUrl: (dataUrl: string, name: string) => Promise<void>;
  resetEdits: () => void;
  clearImage: () => void;
  setCrop: (crop: CropSettings | null) => void;
  setAspectRatioMode: (id: string) => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  toggleFlipH: () => void;
  toggleFlipV: () => void;
  setResizeWidth: (w: number) => void;
  setResizeHeight: (h: number) => void;
  toggleAspectLock: () => void;
  setFitMode: (mode: string) => void;
  setFormat: (fmt: SupportedFormat) => void;
  setQuality: (q: number) => void;
  setFlattenBg: (color: string) => void;
  setStripMetadata: (val: boolean) => void;
  performExport: (
    destPath: string,
    overrides?: {
      format?: SupportedFormat;
      quality?: number;
      stripMetadata?: boolean;
    }
  ) => Promise<ExportResult>;
}

const ImageContext = createContext<ImageContextType | null>(null);

export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit settings
  const [crop, setCrop] = useState<CropSettings | null>(null);
  const [aspectRatioMode, setAspectRatioModeState] = useState<string>("free");
  const [rotate, setRotate] = useState<number>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [resizeWidth, setResizeWidthState] = useState<number>(0);
  const [resizeHeight, setResizeHeightState] = useState<number>(0);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [fitMode, setFitMode] = useState("contain");
  const [format, setFormatState] = useState<SupportedFormat>("webp");
  const [quality, setQuality] = useState<number>(85);
  const [flattenBg, setFlattenBg] = useState<string>("#ffffff");
  const [stripMetadata, setStripMetadata] = useState(true);

  // View state
  const [activeTab, setActiveTab] = useState<"crop" | "resize" | "upscale" | "cutout">("crop");
  const [showCheckerboard, setShowCheckerboard] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  // Cutout state
  const [cutoutModel, setCutoutModelState] = useState<CutoutModelType>(() => {
    const saved = localStorage.getItem("snap_cutout_model");
    if (saved && CUTOUT_MODELS.some((m) => m.id === saved)) {
      return saved as CutoutModelType;
    }
    return "rmbg-2.0";
  });
  const [hfToken, setHfTokenState] = useState<string>(() => {
    return localStorage.getItem("snap_hf_token") || "";
  });
  const [isCutoutActive, setIsCutoutActive] = useState(false);
  const [isCutoutLoading, setIsCutoutLoading] = useState(false);
  const [cutoutProgress, setCutoutProgress] = useState<string | null>(null);
  const [cutoutDataUrl, setCutoutDataUrl] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);

  // Upscale state
  const [upscaleModel, setUpscaleModelState] = useState<UpscaleModelType>(() => {
    const saved = localStorage.getItem("snap_upscale_model");
    if (saved === "realesrgan-x4plus" || saved === "realesrgan-x4plus-anime") return saved;
    return "realesrgan-x4plus";
  });
  const [upscaleScale, setUpscaleScaleState] = useState<2 | 4>(() => {
    const saved = localStorage.getItem("snap_upscale_scale");
    if (saved === "2" || saved === "4") return Number(saved) as 2 | 4;
    return 2;
  });
  const [isUpscaleActive, setIsUpscaleActive] = useState(false);
  const [isUpscaleLoading, setIsUpscaleLoading] = useState(false);
  const [upscaleProgress, setUpscaleProgress] = useState<string | null>(null);
  const [upscaleDataUrl, setUpscaleDataUrl] = useState<string | null>(null);
  const [isUpscaleModelReady, setIsUpscaleModelReady] = useState(false);
  const [splitSliderPos, setSplitSliderPos] = useState(50);

  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);

  const setCutoutModel = useCallback((model: CutoutModelType) => {
    setCutoutModelState(model);
    localStorage.setItem("snap_cutout_model", model);
  }, []);

  const setHfToken = useCallback((token: string) => {
    setHfTokenState(token);
    if (token) {
      localStorage.setItem("snap_hf_token", token);
    } else {
      localStorage.removeItem("snap_hf_token");
    }
  }, []);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const checkModelStatus = useCallback(async (modelId?: CutoutModelType): Promise<boolean> => {
    try {
      const targetModel = modelId || cutoutModel;
      const ready = await invoke<boolean>("check_cutout_model", { modelId: targetModel });
      setIsModelReady(ready);
      return ready;
    } catch {
      setIsModelReady(false);
      return false;
    }
  }, [cutoutModel]);

  useEffect(() => {
    checkModelStatus(cutoutModel);
  }, [cutoutModel, checkModelStatus]);

  const applyBackgroundRemoval = useCallback(async () => {
    const source = imagePath || imageDataUrl;
    if (!source) return;

    setIsCutoutLoading(true);
    setError(null);
    try {
      const ready = await invoke<boolean>("check_cutout_model", { modelId: cutoutModel });
      const modelInfo =
        CUTOUT_MODELS.find((m) => m.id === cutoutModel) || CUTOUT_MODELS[0];
      if (!ready) {
        setCutoutProgress(`Downloading ${modelInfo.shortName} (${modelInfo.size})...`);
        await invoke("download_cutout_model", {
          modelId: cutoutModel,
          hfToken: hfToken.trim() || undefined,
        });
        setIsModelReady(true);
      }

      setCutoutProgress(
        `Segmenting with ${modelInfo.shortName} (${modelInfo.resolution})...`
      );
      const resultDataUrl = await invoke<string>("remove_background", {
        path: source,
        modelId: cutoutModel,
        hfToken: hfToken.trim() || undefined,
      });

      setCutoutDataUrl(resultDataUrl);
      setIsCutoutActive(true);
      setShowCheckerboard(true);

      // Default format away from JPEG if it has no alpha
      setFormatState((prev) => (prev === "jpeg" ? "png" : prev));
    } catch (err) {
      console.error("Background removal error:", err);
      setError(typeof err === "string" ? err : "Failed to remove background");
    } finally {
      setIsCutoutLoading(false);
      setCutoutProgress(null);
    }
  }, [imagePath, imageDataUrl, cutoutModel, hfToken, setShowCheckerboard]);

  const restoreBackground = useCallback(() => {
    setIsCutoutActive(false);
  }, []);

  const setUpscaleModel = useCallback((model: UpscaleModelType) => {
    setUpscaleModelState(model);
    localStorage.setItem("snap_upscale_model", model);
  }, []);

  const setUpscaleScale = useCallback((scale: 2 | 4) => {
    setUpscaleScaleState(scale);
    localStorage.setItem("snap_upscale_scale", String(scale));
  }, []);

  const checkUpscaleModelStatus = useCallback(async (modelId?: UpscaleModelType): Promise<boolean> => {
    try {
      const targetModel = modelId || upscaleModel;
      const ready = await invoke<boolean>("check_upscale_model", { modelId: targetModel });
      setIsUpscaleModelReady(ready);
      return ready;
    } catch {
      setIsUpscaleModelReady(false);
      return false;
    }
  }, [upscaleModel]);

  useEffect(() => {
    checkUpscaleModelStatus(upscaleModel);
  }, [upscaleModel, checkUpscaleModelStatus]);

  const applyUpscale = useCallback(async () => {
    const source = isCutoutActive && cutoutDataUrl ? cutoutDataUrl : (imagePath || imageDataUrl);
    if (!source) return;

    setIsUpscaleLoading(true);
    setError(null);
    try {
      const ready = await invoke<boolean>("check_upscale_model", { modelId: upscaleModel });
      if (!ready) {
        const modelLabel =
          upscaleModel === "realesrgan-x4plus-anime" ? "Real-ESRGAN Anime (~18.4 MB)" : "Real-ESRGAN x4plus (~68.8 MB)";
        setUpscaleProgress(`Downloading ${modelLabel}...`);
        await invoke("download_upscale_model", { modelId: upscaleModel });
        setIsUpscaleModelReady(true);
      }

      const archLabel =
        upscaleModel === "realesrgan-x4plus-anime" ? "Real-ESRGAN Anime 6B" : "Real-ESRGAN x4plus";
      setUpscaleProgress(`Upscaling ${upscaleScale}× with ${archLabel}...`);
      const resultDataUrl = await invoke<string>("upscale_image", {
        source,
        modelId: upscaleModel,
        scale: upscaleScale,
        maxDim: 1920,
      });

      setUpscaleDataUrl(resultDataUrl);
      setIsUpscaleActive(true);
      setSplitSliderPos(50);
    } catch (err) {
      console.error("Upscaling error:", err);
      setError(typeof err === "string" ? err : "Failed to upscale image");
    } finally {
      setIsUpscaleLoading(false);
      setUpscaleProgress(null);
    }
  }, [imagePath, imageDataUrl, isCutoutActive, cutoutDataUrl, upscaleModel, upscaleScale]);

  const restoreUpscale = useCallback(() => {
    setIsUpscaleActive(false);
  }, []);

  const openExportModal = useCallback(() => {
    setExportResult(null);
    setIsExportModalOpen(true);
  }, []);

  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
    setExportResult(null);
  }, []);

  const clearExportResult = useCallback(() => {
    setExportResult(null);
  }, []);

  const resetEdits = useCallback(() => {
    if (!metadata) return;
    setCrop(null);
    setAspectRatioModeState("free");
    setRotate(0);
    setFlipH(false);
    setFlipV(false);
    setResizeWidthState(metadata.width);
    setResizeHeightState(metadata.height);
    setAspectRatioLocked(true);
    setIsCutoutActive(false);
    setIsUpscaleActive(false);
    setUpscaleDataUrl(null);
    setUpscaleProgress(null);
  }, [metadata]);

  const clearImage = useCallback(() => {
    setImagePath(null);
    setImageName(null);
    setImageDataUrl(null);
    setMetadata(null);
    setCrop(null);
    setRotate(0);
    setFlipH(false);
    setFlipV(false);
    setResizeWidthState(0);
    setResizeHeightState(0);
    setExportResult(null);
    setError(null);
    setIsCutoutActive(false);
    setCutoutDataUrl(null);
    setCutoutProgress(null);
    setIsUpscaleActive(false);
    setUpscaleDataUrl(null);
    setUpscaleProgress(null);
  }, []);

  const loadImageFromPath = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Inspect metadata
      const meta = await invoke<ImageMetadata>("inspect_image", { path });
      // 2. Fetch preview data url
      const previewUrl = await invoke<string>("get_preview_data_url", {
        path,
        maxDim: 1920,
      });

      const extractedName = path.split(/[/\\]/).pop() || "image";

      setImagePath(path);
      setImageName(extractedName);
      setMetadata(meta);
      setImageDataUrl(previewUrl);

      // Default resize dimensions match original
      setResizeWidthState(meta.width);
      setResizeHeightState(meta.height);

      // Reset transform states
      setCrop(null);
      setAspectRatioModeState("free");
      setRotate(0);
      setFlipH(false);
      setFlipV(false);
      setIsCutoutActive(false);
      setCutoutDataUrl(null);
      setIsUpscaleActive(false);
      setUpscaleDataUrl(null);
      setUpscaleProgress(null);

      // Set initial format intelligently (if source is png, stay png; else webp)
      const lowerFormat = meta.format.toLowerCase();
      if (lowerFormat.includes("png")) {
        setFormatState("png");
      } else if (lowerFormat.includes("jpeg") || lowerFormat.includes("jpg")) {
        setFormatState("jpeg");
      } else {
        setFormatState("webp");
      }
    } catch (err) {
      console.error("Failed to load image:", err);
      setError(typeof err === "string" ? err : "Failed to load image file");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadImageFromDataUrl = useCallback(async (dataUrl: string, name: string) => {
    // For pasted clipboard or dropped canvas buffers
    setIsLoading(true);
    setError(null);
    try {
      const img = new Image();
      img.onload = () => {
        const meta: ImageMetadata = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: "PNG",
          file_size: Math.round((dataUrl.length * 3) / 4),
          has_alpha: true,
        };
        setImagePath(null);
        setImageName(name);
        setImageDataUrl(dataUrl);
        setMetadata(meta);
        setResizeWidthState(meta.width);
        setResizeHeightState(meta.height);
        setCrop(null);
        setRotate(0);
        setFlipH(false);
        setFlipV(false);
        setIsCutoutActive(false);
        setCutoutDataUrl(null);
        setIsUpscaleActive(false);
        setUpscaleDataUrl(null);
        setUpscaleProgress(null);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError("Failed to decode pasted image");
        setIsLoading(false);
      };
      img.src = dataUrl;
    } catch (err) {
      setError(String(err));
      setIsLoading(false);
    }
  }, []);

  const setAspectRatioMode = useCallback((id: string) => {
    setAspectRatioModeState(id);
    if (!metadata) return;

    const currentW = (rotate === 90 || rotate === 270) ? metadata.height : metadata.width;
    const currentH = (rotate === 90 || rotate === 270) ? metadata.width : metadata.height;

    const opt = COMMON_ASPECT_RATIOS.find((r) => r.id === id);
    if (!opt || opt.ratio === null) {
      // Freeform mode: if no crop exists, initialize an 85% centered crop
      setCrop((prev) => {
        if (prev && prev.width > 0 && prev.height > 0) {
          return prev;
        }
        const w = Math.round(currentW * 0.85);
        const h = Math.round(currentH * 0.85);
        const x = Math.max(0, Math.round((currentW - w) / 2));
        const y = Math.max(0, Math.round((currentH - h) / 2));
        return { x, y, width: w, height: h };
      });
      return;
    }

    // Preset aspect ratio mode: calculate 85% centered box matching ratio
    let targetW = currentW;
    let targetH = Math.round(targetW / opt.ratio);

    if (targetH > currentH) {
      targetH = currentH;
      targetW = Math.round(targetH * opt.ratio);
    }

    targetW = Math.round(targetW * 0.85);
    targetH = Math.round(targetH * 0.85);

    const x = Math.max(0, Math.round((currentW - targetW) / 2));
    const y = Math.max(0, Math.round((currentH - targetH) / 2));

    setCrop({ x, y, width: targetW, height: targetH });
  }, [metadata, rotate]);

  const rotateCW = useCallback(() => {
    setRotate((prev) => (prev + 90) % 360);
    // Reset crop on rotate to prevent bounds misalignment
    setCrop(null);
  }, []);

  const rotateCCW = useCallback(() => {
    setRotate((prev) => (prev + 270) % 360);
    setCrop(null);
  }, []);

  const toggleFlipH = useCallback(() => setFlipH((prev) => !prev), []);
  const toggleFlipV = useCallback(() => setFlipV((prev) => !prev), []);

  const setResizeWidth = useCallback((newW: number) => {
    setResizeWidthState(newW);
    if (aspectRatioLocked && metadata && metadata.width > 0) {
      const activeW = crop ? crop.width : ((rotate === 90 || rotate === 270) ? metadata.height : metadata.width);
      const activeH = crop ? crop.height : ((rotate === 90 || rotate === 270) ? metadata.width : metadata.height);
      const ratio = activeH / activeW;
      setResizeHeightState(Math.max(1, Math.round(newW * ratio)));
    }
  }, [aspectRatioLocked, metadata, crop, rotate]);

  const setResizeHeight = useCallback((newH: number) => {
    setResizeHeightState(newH);
    if (aspectRatioLocked && metadata && metadata.height > 0) {
      const activeW = crop ? crop.width : ((rotate === 90 || rotate === 270) ? metadata.height : metadata.width);
      const activeH = crop ? crop.height : ((rotate === 90 || rotate === 270) ? metadata.width : metadata.height);
      const ratio = activeW / activeH;
      setResizeWidthState(Math.max(1, Math.round(newH * ratio)));
    }
  }, [aspectRatioLocked, metadata, crop, rotate]);

  const toggleAspectLock = useCallback(() => {
    setAspectRatioLocked((prev) => !prev);
  }, []);

  const performExport = useCallback(
    async (
      destPath: string,
      overrides?: {
        format?: SupportedFormat;
        quality?: number;
        stripMetadata?: boolean;
      }
    ): Promise<ExportResult> => {
      let source: string | null = null;
      let removeBg: boolean | undefined = undefined;
      let cutoutM: CutoutModelType | undefined = undefined;
      let upscaleS: 2 | 4 | undefined = undefined;
      let upscaleM: UpscaleModelType | undefined = undefined;

      // Prefer already-processed in-memory image buffers to prevent re-running 60s CPU neural inference
      if (isUpscaleActive && upscaleDataUrl) {
        source = upscaleDataUrl;
      } else if (isCutoutActive && cutoutDataUrl) {
        source = cutoutDataUrl;
      } else {
        source = imagePath || imageDataUrl;
        removeBg = isCutoutActive || undefined;
        cutoutM = isCutoutActive ? cutoutModel : undefined;
        upscaleS = isUpscaleActive ? upscaleScale : undefined;
        upscaleM = isUpscaleActive ? upscaleModel : undefined;
      }

      if (!source) {
        throw new Error("No source image available for export");
      }

      const activeFormat = overrides?.format ?? format;
      const activeQuality = overrides?.quality ?? quality;
      const activeStripMetadata = overrides?.stripMetadata ?? stripMetadata;

      setIsExporting(true);
      try {
        const settings: ExportSettings = {
          crop: crop || undefined,
          rotate: rotate !== 0 ? rotate : undefined,
          flip_horizontal: flipH || undefined,
          flip_vertical: flipV || undefined,
          resize: {
            width: resizeWidth > 0 ? resizeWidth : undefined,
            height: resizeHeight > 0 ? resizeHeight : undefined,
            preserve_aspect_ratio: aspectRatioLocked,
            fit_mode: fitMode,
          },
          format: activeFormat,
          quality: activeFormat === "png" ? undefined : activeQuality,
          flatten_background: activeFormat === "jpeg" ? flattenBg : undefined,
          strip_metadata: activeStripMetadata,
          remove_background: removeBg,
          cutout_model: cutoutM,
          upscale_scale: upscaleS,
          upscale_model: upscaleM,
        };

        const result = await invoke<ExportResult>("export_image", {
          sourcePath: source,
          destinationPath: destPath,
          settings,
        });

        setExportResult(result);
        return result;
      } finally {
        setIsExporting(false);
      }
    },
    [
      imagePath,
      imageDataUrl,
      crop,
      rotate,
      flipH,
      flipV,
      resizeWidth,
      resizeHeight,
      aspectRatioLocked,
      fitMode,
      format,
      quality,
      flattenBg,
      stripMetadata,
      isCutoutActive,
      cutoutDataUrl,
      cutoutModel,
      isUpscaleActive,
      upscaleDataUrl,
      upscaleScale,
      upscaleModel,
    ]
  );

  return (
    <ImageContext.Provider
      value={{
        imagePath,
        imageName,
        imageDataUrl,
        metadata,
        isLoading,
        error,
        crop,
        aspectRatioMode,
        rotate,
        flipH,
        flipV,
        resizeWidth,
        resizeHeight,
        aspectRatioLocked,
        fitMode,
        format,
        quality,
        flattenBg,
        stripMetadata,
        activeTab,
        setActiveTab,
        showCheckerboard,
        setShowCheckerboard,
        showBeforeAfter,
        setShowBeforeAfter,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,
        isCutoutActive,
        isCutoutLoading,
        cutoutProgress,
        cutoutDataUrl,
        isModelReady,
        cutoutModel,
        setCutoutModel,
        hfToken,
        setHfToken,
        checkModelStatus,
        applyBackgroundRemoval,
        restoreBackground,
        isUpscaleActive,
        isUpscaleLoading,
        upscaleProgress,
        upscaleDataUrl,
        isUpscaleModelReady,
        upscaleModel,
        setUpscaleModel,
        upscaleScale,
        setUpscaleScale,
        splitSliderPos,
        setSplitSliderPos,
        checkUpscaleModelStatus,
        applyUpscale,
        restoreUpscale,
        isSettingsModalOpen,
        openSettingsModal,
        closeSettingsModal,
        isExporting,
        exportResult,
        isExportModalOpen,
        openExportModal,
        closeExportModal,
        clearExportResult,
        loadImageFromPath,
        loadImageFromDataUrl,
        resetEdits,
        clearImage,
        setCrop,
        setAspectRatioMode,
        rotateCW,
        rotateCCW,
        toggleFlipH,
        toggleFlipV,
        setResizeWidth,
        setResizeHeight,
        toggleAspectLock,
        setFitMode,
        setFormat: setFormatState,
        setQuality,
        setFlattenBg,
        setStripMetadata,
        performExport,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

export const useImage = (): ImageContextType => {
  const ctx = useContext(ImageContext);
  if (!ctx) {
    throw new Error("useImage must be used within an ImageProvider");
  }
  return ctx;
};
