import React from "react";
import { useImage } from "../../../context/ImageContext";
import { SupportedFormat } from "../../../types/image";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const FormatPanel: React.FC = () => {
  const {
    format,
    setFormat,
    quality,
    setQuality,
    flattenBg,
    setFlattenBg,
    metadata,
  } = useImage();

  const formats: { id: SupportedFormat; label: string; desc: string }[] = [
    { id: "webp", label: "WebP", desc: "Modern web standard, small files" },
    { id: "png", label: "PNG", desc: "Lossless with transparency" },
    { id: "jpeg", label: "JPEG", desc: "Universal photo compatibility" },
  ];

  return (
    <div className="sidebar-content">
      {/* Format Selection */}
      <div className="control-group">
        <label className="control-label">
          <span>Target Format</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              className={`btn btn-secondary ${format === fmt.id ? "active" : ""}`}
              onClick={() => setFormat(fmt.id)}
              style={{ fontSize: "12px", height: "32px", fontWeight: 500 }}
              title={fmt.desc}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quality Slider (for WebP and JPEG) */}
      <div className="control-group">
        <div className="control-label">
          <span>Compression Quality</span>
          <span className="control-label-hint">
            {format === "png" ? "Lossless" : `${quality}%`}
          </span>
        </div>
        {format === "png" ? (
          <div
            style={{
              padding: "10px",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <CheckCircle2 size={14} color="var(--success)" />
            <span>PNG exports retain 100% pixel fidelity.</span>
          </div>
        ) : (
          <div className="slider-container">
            <input
              type="range"
              className="slider-input"
              min={10}
              max={100}
              step={1}
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
            />
            <span className="slider-value">{quality}%</span>
          </div>
        )}
      </div>

      {/* Transparency Flattening Notice (for JPEG) */}
      {format === "jpeg" && metadata?.has_alpha && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "var(--warning-surface)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--warning)" }}>
            <AlertTriangle size={15} />
            <span style={{ fontWeight: 600 }}>JPEG does not support transparency</span>
          </div>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.4" }}>
            Transparent pixels will be composited onto a solid background color.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)" }}>Background:</label>
            <input
              type="color"
              value={flattenBg}
              onChange={(e) => setFlattenBg(e.target.value)}
              style={{
                width: "28px",
                height: "28px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                backgroundColor: "transparent",
              }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>
              {flattenBg.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
