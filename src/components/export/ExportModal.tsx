import React, { useState } from "react";
import { useImage } from "../../context/ImageContext";
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
    quality,
    stripMetadata,
    performExport,
    isExporting,
    exportResult,
  } = useImage();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      await performExport(destPath);
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
            /* Pre-Export Confirmation */
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  padding: "14px",
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Target Format</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--accent-primary)" }}>
                    {format.toUpperCase()} {format !== "png" ? `(${quality}% quality)` : "(Lossless)"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Output Dimensions</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {finalW} × {finalH} px
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Privacy Policy</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: stripMetadata ? "var(--success)" : "var(--warning)",
                    }}
                  >
                    {stripMetadata ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                    {stripMetadata ? "Strip Metadata" : "Preserve Metadata"}
                  </span>
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
