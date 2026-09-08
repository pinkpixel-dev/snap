import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useImage } from "./ImageContext";
import { PromptPoint, SamMaskResult, SamEffectSettings, CropSettings } from "../types/image";

interface SmartSelectContextType {
  points: PromptPoint[];
  mode: "include" | "exclude";
  setMode: (mode: "include" | "exclude") => void;
  isModelReady: boolean;
  isDownloading: boolean;
  downloadProgress: string | null;
  isEncoding: boolean;
  isDecoding: boolean;
  isApplyingEffect: boolean;
  maskDataUrl: string | null;
  score: number;
  bounds: CropSettings | null;
  invertSelection: boolean;
  setInvertSelection: (val: boolean | ((prev: boolean) => boolean)) => void;

  // Effects & Adjustments
  selectedEffect: "cutout" | "blur" | "color_splash" | "adjustments";
  setSelectedEffect: (eff: "cutout" | "blur" | "color_splash" | "adjustments") => void;
  blurRadius: number;
  setBlurRadius: (r: number) => void;
  adjustmentTarget: "subject" | "background";
  setAdjustmentTarget: (t: "subject" | "background") => void;
  brightness: number;
  setBrightness: (b: number) => void;
  contrast: number;
  setContrast: (c: number) => void;
  saturation: number;
  setSaturation: (s: number) => void;

  // Actions
  checkModelStatus: () => Promise<boolean>;
  downloadModel: () => Promise<void>;
  addPoint: (x: number, y: number, labelOverride?: number) => Promise<void>;
  undoPoint: () => void;
  clearPoints: () => void;
  applyActiveEffect: () => Promise<void>;
  exportCutout: () => Promise<void>;
  cropToSelection: () => void;
}

const SmartSelectContext = createContext<SmartSelectContextType | undefined>(undefined);

export const SmartSelectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    imagePath,
    imageDataUrl,
    imageName,
    activeTab,
    setActiveTab,
    setCrop,
    loadImageFromDataUrl,
    setFormat,
    openExportModal,
  } = useImage();

  const [points, setPoints] = useState<PromptPoint[]>([]);
  const [mode, setMode] = useState<"include" | "exclude">("include");
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isApplyingEffect, setIsApplyingEffect] = useState(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [bounds, setBounds] = useState<CropSettings | null>(null);
  const [invertSelection, setInvertSelection] = useState(false);

  const [selectedEffect, setSelectedEffect] = useState<"cutout" | "blur" | "color_splash" | "adjustments">("cutout");
  const [blurRadius, setBlurRadius] = useState<number>(15);
  const [adjustmentTarget, setAdjustmentTarget] = useState<"subject" | "background">("background");
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);

  const encodedSourceRef = useRef<string | null>(null);

  const checkModelStatus = useCallback(async (): Promise<boolean> => {
    try {
      const ready = await invoke<boolean>("check_sam_model");
      setIsModelReady(ready);
      return ready;
    } catch {
      setIsModelReady(false);
      return false;
    }
  }, []);

  const downloadModel = useCallback(async () => {
    setIsDownloading(true);
    setDownloadProgress("Downloading SlimSAM ONNX models (~13.7 MB)...");
    try {
      await invoke("download_sam_model");
      setIsModelReady(true);
      setDownloadProgress(null);
    } catch (err) {
      console.error("SAM download error:", err);
      setDownloadProgress("Download failed. Click to retry.");
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // Check model on mount
  useEffect(() => {
    checkModelStatus();
  }, [checkModelStatus]);

  // When active tab is smart-select and model is ready, initialize session with active image
  useEffect(() => {
    if (activeTab !== "smart-select" || !isModelReady) {
      return;
    }

    const currentSource = imagePath || imageDataUrl;
    if (!currentSource || encodedSourceRef.current === currentSource) {
      return;
    }

    let isMounted = true;
    setIsEncoding(true);

    invoke("init_sam_session", { source: currentSource })
      .then(() => {
        if (isMounted) {
          encodedSourceRef.current = currentSource;
          setIsEncoding(false);
        }
      })
      .catch((err) => {
        console.error("Failed to initialize SAM session:", err);
        if (isMounted) {
          setIsEncoding(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, isModelReady, imagePath, imageDataUrl]);

  // Reset points when image changes
  useEffect(() => {
    setPoints([]);
    setMaskDataUrl(null);
    setBounds(null);
    setScore(0);
    encodedSourceRef.current = null;
  }, [imagePath, imageDataUrl]);

  const runDecode = useCallback(async (currentPoints: PromptPoint[]) => {
    if (currentPoints.length === 0) {
      setMaskDataUrl(null);
      setBounds(null);
      setScore(0);
      return;
    }

    setIsDecoding(true);
    try {
      const res = await invoke<SamMaskResult>("decode_sam_mask", { points: currentPoints });
      setMaskDataUrl(res.mask_data_url || null);
      setScore(res.score || 0);
      setBounds(res.bounds || null);
    } catch (err) {
      console.error("Decode SAM mask error:", err);
    } finally {
      setIsDecoding(false);
    }
  }, []);

  const addPoint = useCallback(
    async (x: number, y: number, labelOverride?: number) => {
      const label = labelOverride !== undefined ? labelOverride : mode === "include" ? 1 : 0;
      const newPoint: PromptPoint = {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        label,
      };

      const nextPoints = [...points, newPoint];
      setPoints(nextPoints);
      await runDecode(nextPoints);
    },
    [points, mode, runDecode]
  );

  const undoPoint = useCallback(() => {
    if (points.length === 0) return;
    const nextPoints = points.slice(0, -1);
    setPoints(nextPoints);
    runDecode(nextPoints);
  }, [points, runDecode]);

  const clearPoints = useCallback(() => {
    setPoints([]);
    setMaskDataUrl(null);
    setBounds(null);
    setScore(0);
    runDecode([]);
  }, [runDecode]);

  const cropToSelection = useCallback(() => {
    if (!bounds) return;
    setCrop(bounds);
    setActiveTab("crop");
  }, [bounds, setCrop, setActiveTab]);

  const applyActiveEffect = useCallback(async () => {
    const source = imagePath || imageDataUrl;
    if (!source || !maskDataUrl) return;

    setIsApplyingEffect(true);
    try {
      const settings: SamEffectSettings = {
        effect: selectedEffect,
        blur_radius: selectedEffect === "blur" ? blurRadius : undefined,
        invert: invertSelection,
        target: selectedEffect === "adjustments" ? adjustmentTarget : undefined,
        brightness: selectedEffect === "adjustments" ? brightness / 100.0 : undefined,
        contrast: selectedEffect === "adjustments" ? contrast / 100.0 : undefined,
        saturation: selectedEffect === "adjustments" ? saturation / 100.0 : undefined,
      };

      const resultDataUrl = await invoke<string>("apply_sam_effect", {
        source,
        settings,
      });

      const nextName = imageName ? `${imageName.replace(/\.[^/.]+$/, "")}_edited.png` : "edited.png";
      await loadImageFromDataUrl(resultDataUrl, nextName, { derived: true });

      // Clear points on success
      setPoints([]);
      setMaskDataUrl(null);
      setBounds(null);
      setScore(0);
    } catch (err) {
      console.error("Apply effect error:", err);
    } finally {
      setIsApplyingEffect(false);
    }
  }, [
    imagePath,
    imageDataUrl,
    imageName,
    maskDataUrl,
    selectedEffect,
    blurRadius,
    invertSelection,
    adjustmentTarget,
    brightness,
    contrast,
    saturation,
    loadImageFromDataUrl,
  ]);

  const exportCutout = useCallback(async () => {
    const source = imagePath || imageDataUrl;
    if (!source || !maskDataUrl) return;

    setIsApplyingEffect(true);
    try {
      const settings: SamEffectSettings = {
        effect: "cutout",
        invert: invertSelection,
      };

      const resultDataUrl = await invoke<string>("apply_sam_effect", {
        source,
        settings,
      });

      const nextName = imageName
        ? `${imageName.replace(/\.[^/.]+$/, "")}_cutout.png`
        : "cutout.png";
      await loadImageFromDataUrl(resultDataUrl, nextName, { derived: true });

      // Force format to PNG to preserve alpha transparency on export
      setFormat("png");

      // Clear points and active mask overlay on canvas
      setPoints([]);
      setMaskDataUrl(null);
      setBounds(null);
      setScore(0);

      // Trigger the export modal immediately
      openExportModal();
    } catch (err) {
      console.error("Export cutout error:", err);
    } finally {
      setIsApplyingEffect(false);
    }
  }, [
    imagePath,
    imageDataUrl,
    imageName,
    maskDataUrl,
    invertSelection,
    loadImageFromDataUrl,
    setFormat,
    openExportModal,
  ]);

  return (
    <SmartSelectContext.Provider
      value={{
        points,
        mode,
        setMode,
        isModelReady,
        isDownloading,
        downloadProgress,
        isEncoding,
        isDecoding,
        isApplyingEffect,
        maskDataUrl,
        score,
        bounds,
        invertSelection,
        setInvertSelection,
        selectedEffect,
        setSelectedEffect,
        blurRadius,
        setBlurRadius,
        adjustmentTarget,
        setAdjustmentTarget,
        brightness,
        setBrightness,
        contrast,
        setContrast,
        saturation,
        setSaturation,
        checkModelStatus,
        downloadModel,
        addPoint,
        undoPoint,
        clearPoints,
        applyActiveEffect,
        exportCutout,
        cropToSelection,
      }}
    >
      {children}
    </SmartSelectContext.Provider>
  );
};

export const useSmartSelect = (): SmartSelectContextType => {
  const context = useContext(SmartSelectContext);
  if (!context) {
    throw new Error("useSmartSelect must be used within a SmartSelectProvider");
  }
  return context;
};
