import React from "react";
import { useImage } from "../../../context/ImageContext";
import { COMMON_ASPECT_RATIOS } from "../../../types/image";
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";

export const CropPanel: React.FC = () => {
  const {
    crop,
    aspectRatioMode,
    setAspectRatioMode,
    rotate,
    rotateCW,
    rotateCCW,
    flipH,
    flipV,
    toggleFlipH,
    toggleFlipV,
    setCrop,
    metadata,
  } = useImage();

  const handleResetCrop = () => {
    setCrop(null);
    setAspectRatioMode("free");
  };

  const activeW = (rotate === 90 || rotate === 270) ? metadata?.height : metadata?.width;
  const activeH = (rotate === 90 || rotate === 270) ? metadata?.width : metadata?.height;

  return (
    <div className="sidebar-content">
      {/* Aspect Ratio Presets */}
      <div className="control-group">
        <div className="control-label">
          <span>Aspect Ratio</span>
          {crop && (
            <button
              type="button"
              className="btn-link"
              onClick={handleResetCrop}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-primary)",
                fontSize: "11px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Clear Crop
            </button>
          )}
        </div>
        <div className="ratio-grid">
          {COMMON_ASPECT_RATIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn btn-secondary ${aspectRatioMode === item.id ? "active" : ""}`}
              onClick={() => setAspectRatioMode(item.id)}
              style={{ fontSize: "12px", height: "30px" }}
              title={item.description || item.label}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation & Flipping */}
      <div className="control-group">
        <label className="control-label">
          <span>Rotate & Flip</span>
          {rotate !== 0 && (
            <span className="control-label-hint">{rotate}°</span>
          )}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={rotateCCW}
            title="Rotate 90° Counter-Clockwise"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={rotateCW}
            title="Rotate 90° Clockwise"
          >
            <RotateCw size={15} />
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${flipH ? "active" : ""}`}
            onClick={toggleFlipH}
            title="Flip Horizontally"
          >
            <FlipHorizontal size={15} />
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${flipV ? "active" : ""}`}
            onClick={toggleFlipV}
            title="Flip Vertically"
          >
            <FlipVertical size={15} />
          </button>
        </div>
      </div>

      {/* Crop Info Summary */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
          <span>Source size</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            {activeW} × {activeH} px
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
          <span>Crop bounds</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
            {crop ? `${crop.width} × ${crop.height} px` : "Full frame"}
          </span>
        </div>
        {crop && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "11px" }}>
            <span>Offset (X, Y)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {crop.x}, {crop.y}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
