import React from "react";
import { useSmartSelect } from "../../../context/SmartSelectContext";
import { useImage } from "../../../context/ImageContext";
import {
  Wand2,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  Minus,
  RotateCcw,
  Trash2,
  FlipHorizontal2,
  Scissors,
  Palette,
  Sliders,
  Crop,
  Sparkles,
} from "lucide-react";

export const SmartSelectPanel: React.FC = () => {
  const {
    points,
    mode,
    setMode,
    isModelReady,
    isDownloading,
    downloadProgress,
    isEncoding,
    isDecoding,
    isApplyingEffect,
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
    downloadModel,
    undoPoint,
    clearPoints,
    applyActiveEffect,
    cropToSelection,
  } = useSmartSelect();

  const { imagePath, imageDataUrl } = useImage();
  const hasImage = Boolean(imagePath || imageDataUrl);
  const hasPoints = points.length > 0;

  return (
    <div className="sidebar-content">
      {/* Model Status Card */}
      <div className="control-group">
        <label className="control-label">
          <span>Smart Object Selection</span>
        </label>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            margin: "0 0 10px 0",
          }}
        >
          Click or tap anywhere on an object to isolate it. SlimSAM ONNX runs
          offline on your machine for instant interactive mask generation.
        </p>

        {!isModelReady ? (
          <div
            style={{
              padding: "12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              backgroundColor: "var(--bg-surface)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Download size={16} style={{ color: "var(--accent-primary)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>SlimSAM Weights Needed</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Quantized ONNX models (~13.7 MB total)
                </div>
              </div>
            </div>

            {downloadProgress && (
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                {downloadProgress}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={downloadModel}
              disabled={isDownloading}
              style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
            >
              {isDownloading ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download SlimSAM Model</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                SlimSAM Model Ready
              </span>
            </div>
            {isEncoding && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                <Loader2 size={12} className="spin" />
                <span>Encoding...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isModelReady && hasImage && (
        <>
          {/* Click Mode Toggle (Mobile / Tap friendly) */}
          <div className="control-group">
            <label className="control-label">
              <span>Click Mode</span>
              {hasPoints && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {points.length} point{points.length > 1 ? "s" : ""} ({(score * 100).toFixed(0)}% match)
                </span>
              )}
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                marginBottom: "8px",
              }}
            >
              <button
                type="button"
                className={`btn ${mode === "include" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMode("include")}
                style={{
                  justifyContent: "center",
                  borderColor: mode === "include" ? "#22c55e" : undefined,
                }}
              >
                <Plus size={14} style={{ color: mode === "include" ? "#ffffff" : "#22c55e" }} />
                <span>Include (+)</span>
              </button>

              <button
                type="button"
                className={`btn ${mode === "exclude" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMode("exclude")}
                style={{
                  justifyContent: "center",
                  borderColor: mode === "exclude" ? "#ef4444" : undefined,
                }}
              >
                <Minus size={14} style={{ color: mode === "exclude" ? "#ffffff" : "#ef4444" }} />
                <span>Exclude (-)</span>
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "6px",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={undoPoint}
                disabled={!hasPoints}
                title="Undo last point"
                style={{ justifyContent: "center", fontSize: "11px" }}
              >
                <RotateCcw size={12} />
                <span>Undo</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearPoints}
                disabled={!hasPoints}
                title="Clear all points"
                style={{ justifyContent: "center", fontSize: "11px" }}
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>

              <button
                type="button"
                className={`btn ${invertSelection ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setInvertSelection((prev) => !prev)}
                disabled={!hasPoints}
                title="Invert mask selection"
                style={{ justifyContent: "center", fontSize: "11px" }}
              >
                <FlipHorizontal2 size={12} />
                <span>Invert</span>
              </button>
            </div>
          </div>

          {/* Action Effects */}
          <div className="control-group">
            <label className="control-label">
              <span>Action / Effect</span>
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                marginBottom: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedEffect("cutout")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  border: selectedEffect === "cutout" ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                  backgroundColor: selectedEffect === "cutout" ? "var(--accent-surface)" : "var(--bg-surface)",
                  color: selectedEffect === "cutout" ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                <Scissors size={14} />
                <span>Cutout Subject</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEffect("blur")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  border: selectedEffect === "blur" ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                  backgroundColor: selectedEffect === "blur" ? "var(--accent-surface)" : "var(--bg-surface)",
                  color: selectedEffect === "blur" ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                <Sparkles size={14} />
                <span>Portrait Blur</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEffect("color_splash")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  border: selectedEffect === "color_splash" ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                  backgroundColor: selectedEffect === "color_splash" ? "var(--accent-surface)" : "var(--bg-surface)",
                  color: selectedEffect === "color_splash" ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                <Palette size={14} />
                <span>Color Splash</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEffect("adjustments")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  border: selectedEffect === "adjustments" ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                  backgroundColor: selectedEffect === "adjustments" ? "var(--accent-surface)" : "var(--bg-surface)",
                  color: selectedEffect === "adjustments" ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                <Sliders size={14} />
                <span>Adjustments</span>
              </button>
            </div>

            {/* Effect Specific Options */}
            {selectedEffect === "blur" && (
              <div
                style={{
                  padding: "10px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Blur Radius</span>
                  <span style={{ fontWeight: 600 }}>{blurRadius} px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={blurRadius}
                  onChange={(e) => setBlurRadius(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                />
              </div>
            )}

            {selectedEffect === "adjustments" && (
              <div
                style={{
                  padding: "10px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Target Layer</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      className={`btn ${adjustmentTarget === "background" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setAdjustmentTarget("background")}
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                    >
                      Background
                    </button>
                    <button
                      type="button"
                      className={`btn ${adjustmentTarget === "subject" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setAdjustmentTarget("subject")}
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                    >
                      Subject
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Brightness</span>
                    <span>{brightness > 0 ? `+${brightness}` : brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Contrast</span>
                    <span>{contrast > 0 ? `+${contrast}` : contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Saturation</span>
                    <span>{saturation > 0 ? `+${saturation}` : saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyActiveEffect}
              disabled={!hasPoints || isApplyingEffect || isDecoding}
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
            >
              {isApplyingEffect ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Applying Effect...</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  <span>Apply Effect to Image</span>
                </>
              )}
            </button>

            {bounds && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cropToSelection}
                style={{ width: "100%", justifyContent: "center", fontSize: "12px" }}
              >
                <Crop size={14} />
                <span>Crop to Subject ({bounds.width}×{bounds.height})</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
