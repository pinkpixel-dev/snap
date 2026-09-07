import React from "react";
import { APP_NAME, APP_VERSION } from "../../lib/app-info";
import { useImage } from "../../context/ImageContext";
import { RotateCcw, Download, Plus, Settings } from "lucide-react";

export const Header: React.FC = () => {
  const {
    imageName,
    metadata,
    resetEdits,
    clearImage,
    openExportModal,
    openSettingsModal,
    crop,
    rotate,
    resizeWidth,
    resizeHeight,
  } = useImage();

  // Calculate current working dimensions
  const activeW = resizeWidth > 0 ? resizeWidth : (crop ? crop.width : (rotate === 90 || rotate === 270 ? metadata?.height : metadata?.width));
  const activeH = resizeHeight > 0 ? resizeHeight : (crop ? crop.height : (rotate === 90 || rotate === 270 ? metadata?.width : metadata?.height));

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <img src="/icon.png" alt="Snap Logo" className="header-brand-icon" onError={(e) => {
          // fallback if root icon not in public
          (e.target as HTMLElement).style.display = "none";
        }} />
        <span>{APP_NAME}</span>
        <span className="version-badge">v{APP_VERSION}</span>
      </div>

      {metadata && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
            {imageName}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {activeW} × {activeH} px · {formatBytes(metadata.file_size)}
          </span>
        </div>
      )}

      <div className="header-actions">
        {metadata ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearImage}
              title="Open a different image"
            >
              <Plus size={15} />
              <span>New</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetEdits}
              title="Reset all adjustments back to original"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openExportModal}
              title="Configure and save image"
            >
              <Download size={15} />
              <span>Export</span>
            </button>
          </>
        ) : null}

        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={openSettingsModal}
          title="App Settings & AI Models"
          style={{ width: "32px", height: "32px" }}
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
