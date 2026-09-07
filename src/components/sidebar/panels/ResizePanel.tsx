import React from "react";
import { useImage } from "../../../context/ImageContext";
import { Link2, Link2Off } from "lucide-react";

export const ResizePanel: React.FC = () => {
  const {
    resizeWidth,
    resizeHeight,
    setResizeWidth,
    setResizeHeight,
    aspectRatioLocked,
    toggleAspectLock,
    metadata,
    crop,
    rotate,
  } = useImage();

  // Source reference dimensions (taking current crop or 90-deg rotation into account)
  const baseW = crop ? crop.width : (rotate === 90 || rotate === 270 ? metadata?.height : metadata?.width) || 1;
  const baseH = crop ? crop.height : (rotate === 90 || rotate === 270 ? metadata?.width : metadata?.height) || 1;

  const handlePercentageScale = (percent: number) => {
    const scale = percent / 100;
    const newW = Math.max(1, Math.round(baseW * scale));
    const newH = Math.max(1, Math.round(baseH * scale));
    setResizeWidth(newW);
    setResizeHeight(newH);
  };

  return (
    <div className="sidebar-content">
      {/* Dimension Inputs */}
      <div className="control-group">
        <label className="control-label">
          <span>Pixel Dimensions</span>
          <span className="control-label-hint">Width × Height</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="number"
              className="input-field"
              value={resizeWidth || ""}
              min={1}
              max={16384}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  setResizeWidth(val);
                }
              }}
              placeholder="Width"
            />
            <span
              style={{
                position: "absolute",
                right: "8px",
                top: "7px",
                fontSize: "11px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            >
              px
            </span>
          </div>

          <button
            type="button"
            className={`btn btn-secondary btn-icon ${aspectRatioLocked ? "active" : ""}`}
            onClick={toggleAspectLock}
            title={aspectRatioLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
          >
            {aspectRatioLocked ? <Link2 size={16} /> : <Link2Off size={16} />}
          </button>

          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="number"
              className="input-field"
              value={resizeHeight || ""}
              min={1}
              max={16384}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  setResizeHeight(val);
                }
              }}
              placeholder="Height"
            />
            <span
              style={{
                position: "absolute",
                right: "8px",
                top: "7px",
                fontSize: "11px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            >
              px
            </span>
          </div>
        </div>
      </div>

      {/* Quick Percentage Scale */}
      <div className="control-group">
        <label className="control-label">
          <span>Scale Presets</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {[25, 50, 75, 100, 150, 200].map((pct) => (
            <button
              key={pct}
              type="button"
              className="btn btn-secondary"
              onClick={() => handlePercentageScale(pct)}
              style={{ fontSize: "12px", height: "30px" }}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Dimension comparison */}
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
            {baseW} × {baseH} px
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
          <span>Target output</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-primary)", fontWeight: 500 }}>
            {resizeWidth || baseW} × {resizeHeight || baseH} px
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "11px" }}>
          <span>Scale factor</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {(((resizeWidth || baseW) / baseW) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};
