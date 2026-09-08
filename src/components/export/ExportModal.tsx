import React, { useState } from "react";
import { useImage } from "../../context/ImageContext";
import { SupportedFormat } from "../../types/image";
import { save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Scissors,
  Sparkles,
} from "lucide-react";

export const ExportModal: React.FC = () => {
  const {
    isExportModalOpen,
    closeExportModal,
    clearExportResult,
    imageName,
    metadata,
    crop,
    rotate,
    resizeWidth,
    resizeHeight,
    format,
    setFormat,
    quality,
    setQuality,
    stripMetadata,
    setStripMetadata,
    isCutoutActive,
    isUpscaleActive,
    performExport,
    isExporting,
    exportResult,
  } = useImage();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [compressionMode, setCompressionMode] = useState<"full" | "compressed">(() => {
    return quality >= 100 || format === "png" ? "full" : "compressed";
  });

  if (!isExportModalOpen) return null;

  // Working dimensions
  const finalW = resizeWidth > 0 ? resizeWidth : (crop ? crop.width : (rotate === 90 || rotate === 270 ? metadata?.height : metadata?.width)) || 1;
  const finalH = resizeHeight > 0 ? resizeHeight : (crop ? crop.height : (rotate === 90 || rotate === 270 ? metadata?.width : metadata?.height)) || 1;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getDefaultSuggestedName = () => {
    if (!imageName) return `snap-export.${format}`;
    const base = imageName.replace(/\.[^/.]+$/, "");
    return `${base}-snap.${format}`;
  };

  const handleStartExport = async () => {
    setErrorMessage(null);
    try {
      const suggestedName = getDefaultSuggestedName();
      const destPath = await save({
        defaultPath: suggestedName,
        filters: [
          {
            name: format.toUpperCase(),
            extensions: [format === "jpeg" ? "jpg" : format],
          },
        ],
      });

      if (!destPath) return; // user cancelled

      const effectiveQuality = compressionMode === "full" ? 100 : (quality >= 100 ? 80 : quality);
      await performExport(destPath, {
        format,
        quality: format === "png" ? undefined : effectiveQuality,
        stripMetadata,
      });
    } catch (err) {
      console.error("Export error:", err);
      setErrorMessage(typeof err === "string" ? err : "Export failed");
    }
  };

  const handleOpenFolder = async () => {
    if (!exportResult?.output_path) return;
    try {
      const parentDir = exportResult.output_path.replace(/[/\\][^/\\]+$/, "");
      await openPath(parentDir);
    } catch (err) {
      console.warn("Could not open destination folder:", err);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeExportModal}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Download size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              {exportResult ? "Export Complete" : "Export Image"}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={closeExportModal}
            style={{ width: "26px", height: "26px" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {exportResult ? (
            /* Results View */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  backgroundColor: "var(--success-surface)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <CheckCircle2 size={22} color="var(--success)" />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>
                    Image successfully saved
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      wordBreak: "break-all",
                    }}
                  >
                    {exportResult.output_path}
                  </div>
                </div>
              </div>

              {/* Compression Metric Pill */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Compression Summary
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "14px", fontFamily: "var(--font-mono)" }}>
                    {formatBytes(exportResult.original_size)}
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <div style={{ fontSize: "14px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    {formatBytes(exportResult.output_size)}
                  </div>
                  {exportResult.saved_percentage > 0 && (
                    <span className="metric-pill">
                      <span className="saved">{exportResult.saved_percentage.toFixed(1)}% smaller</span>
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Dimensions: {exportResult.width} × {exportResult.height} px · Processed in {exportResult.duration_ms} ms
                </div>
              </div>
            </div>
          ) : (
            /* Pre-Export Confirmation & Mode Controls */
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Export Mode (Full vs Compressed) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Export Mode
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {compressionMode === "full" ? "100% Quality / Lossless" : "Compressed File Size"}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                    backgroundColor: "var(--bg-surface)",
                    padding: "4px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCompressionMode("full");
                      if (format !== "png") {
                        setQuality(100);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: compressionMode === "full" ? "var(--bg-elevated)" : "transparent",
                      color: compressionMode === "full" ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: compressionMode === "full" ? 600 : 400,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all var(--duration-fast)",
                    }}
                  >
                    Full (Uncompressed)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompressionMode("compressed");
                      if (quality >= 100) {
                        setQuality(80);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: compressionMode === "compressed" ? "var(--bg-elevated)" : "transparent",
                      color: compressionMode === "compressed" ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: compressionMode === "compressed" ? 600 : 400,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all var(--duration-fast)",
                    }}
                  >
                    Compressed
                  </button>
                </div>
              </div>

              {/* Target Format Quick-Picker */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Format
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                  {(["webp", "png", "jpeg"] as const).map((fmt) => {
                    const isSelected = format === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => {
                          setFormat(fmt as SupportedFormat);
                          if (fmt === "png") {
                            setCompressionMode("full");
                          }
                        }}
                        className={`btn btn-secondary ${isSelected ? "active" : ""}`}
                        style={{
                          height: "34px",
                          fontSize: "12px",
                          fontWeight: isSelected ? 600 : 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compression Slider & Presets (if Compressed mode) */}
              {compressionMode === "compressed" && (
                <div
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {format === "png" ? (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={14} color="var(--success)" />
                      <span>PNG is lossless. Choose WebP or JPEG to apply compression.</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Compression Quality</span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--accent-primary)",
                          }}
                        >
                          {quality >= 100 ? 80 : quality}%
                        </span>
                      </div>
                      <div className="slider-container" style={{ margin: "0" }}>
                        <input
                          type="range"
                          className="slider-input"
                          min={10}
                          max={95}
                          step={1}
                          value={quality >= 100 ? 80 : quality}
                          onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {[
                          { label: "High", val: 85 },
                          { label: "Balanced", val: 75 },
                          { label: "Compact", val: 55 },
                        ].map((preset) => {
                          const isPresetActive = quality === preset.val;
                          return (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setQuality(preset.val)}
                              className={`btn btn-secondary ${isPresetActive ? "active" : ""}`}
                              style={{
                                fontSize: "11px",
                                padding: "4px 8px",
                                height: "28px",
                                fontWeight: isPresetActive ? 600 : 400,
                              }}
                            >
                              {preset.label} ({preset.val}%)
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Output Specs & Privacy Policy Card */}
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Target Specs</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {format.toUpperCase()} · {compressionMode === "full" ? (format === "png" ? "Lossless" : "100% Quality") : `${quality >= 100 ? 80 : quality}% Quality`}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Dimensions</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {finalW} × {finalH} px
                  </span>
                </div>

                {(isCutoutActive || isUpscaleActive) && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-secondary)" }}>AI State</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--success)", fontSize: "11px", fontWeight: 500 }}>
                      {isCutoutActive && <Scissors size={12} />}
                      {isUpscaleActive && <Sparkles size={12} />}
                      <span>{isCutoutActive ? "Cutout Applied (Fast Export)" : "Upscaled (Fast Export)"}</span>
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Privacy & Metadata</span>
                  <button
                    type="button"
                    onClick={() => setStripMetadata(!stripMetadata)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: stripMetadata ? "var(--success)" : "var(--warning)",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                    title="Click to toggle metadata preservation"
                  >
                    {stripMetadata ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    <span>{stripMetadata ? "Strip Metadata" : "Preserve Metadata"}</span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--danger)",
                    fontSize: "12px",
                    padding: "8px 12px",
                    backgroundColor: "var(--danger-surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          {exportResult ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setErrorMessage(null);
                  clearExportResult();
                }}
                title="Adjust settings and export another copy"
              >
                <RotateCcw size={14} />
                <span>Export Another</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenFolder}
              >
                <FolderOpen size={14} />
                <span>Show in Folder</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={closeExportModal}
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeExportModal}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartExport}
                disabled={isExporting}
              >
                {isExporting ? "Processing..." : "Save Image"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
