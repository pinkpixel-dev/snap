import React from "react";
import { useImage } from "../../../context/ImageContext";
import { ShieldCheck, ShieldAlert, Camera, Calendar } from "lucide-react";

export const MetadataPanel: React.FC = () => {
  const { metadata, stripMetadata, setStripMetadata } = useImage();

  if (!metadata) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="sidebar-content">
      {/* Privacy Policy Toggle */}
      <div
        style={{
          padding: "14px",
          backgroundColor: stripMetadata ? "var(--success-surface)" : "var(--bg-surface)",
          border: `1px solid ${stripMetadata ? "rgba(34, 197, 94, 0.3)" : "var(--border-subtle)"}`,
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {stripMetadata ? (
              <ShieldCheck size={18} color="var(--success)" />
            ) : (
              <ShieldAlert size={18} color="var(--warning)" />
            )}
            <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
              Privacy Protection
            </span>
          </div>
          <button
            type="button"
            className={`btn btn-secondary ${stripMetadata ? "active" : ""}`}
            onClick={() => setStripMetadata(!stripMetadata)}
            style={{ fontSize: "12px", height: "28px" }}
          >
            {stripMetadata ? "Stripping Active" : "Preserve Metadata"}
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
          {stripMetadata
            ? "Exports will automatically discard camera model, GPS coordinates, timestamps, and embedded software tags."
            : "Original metadata chunks will be retained where supported by the target format."}
        </p>
      </div>

      {/* Detected Metadata Fields */}
      <div className="control-group">
        <label className="control-label">
          <span>Detected File Details</span>
        </label>
        <div
          style={{
            padding: "12px",
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
            <span style={{ color: "var(--text-secondary)" }}>Format</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
              {metadata.format}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Raw Dimensions</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
              {metadata.width} × {metadata.height} px
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>File Size</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
              {formatBytes(metadata.file_size)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Alpha Channel</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
              {metadata.has_alpha ? "Yes (Transparent)" : "No"}
            </span>
          </div>

          {metadata.camera_model && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Camera size={13} /> Camera
              </span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {metadata.camera_model}
              </span>
            </div>
          )}

          {metadata.date_taken && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={13} /> Taken
              </span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {metadata.date_taken}
              </span>
            </div>
          )}

          {metadata.exif_orientation !== undefined && metadata.exif_orientation !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>EXIF Orientation</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                Tag {metadata.exif_orientation} (Auto-corrected)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
