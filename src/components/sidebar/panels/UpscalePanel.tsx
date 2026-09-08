import React from "react";
import { useImage } from "../../../context/ImageContext";
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Loader2,
  SlidersHorizontal,
  ArrowUpRight,
  Download,
  AlertCircle,
} from "lucide-react";
import { UPSCALE_MODELS, UpscaleModelType } from "../../../types/image";

export const UpscalePanel: React.FC = () => {
  const {
    isUpscaleActive,
    isUpscaleLoading,
    upscaleProgress,
    isUpscaleModelReady,
    upscaleModel,
    setUpscaleModel,
    upscaleScale,
    setUpscaleScale,
    splitSliderPos,
    setSplitSliderPos,
    applyUpscale,
    restoreUpscale,
    imagePath,
    imageDataUrl,
    metadata,
    crop,
    rotate,
    error,
  } = useImage();

  const hasImage = Boolean(imagePath || imageDataUrl);
  const currentModelInfo =
    UPSCALE_MODELS.find((m) => m.id === upscaleModel) || UPSCALE_MODELS[0];

  // Base dimensions (considering crop and 90-degree rotations)
  const baseW = crop
    ? crop.width
    : (rotate === 90 || rotate === 270 ? metadata?.height : metadata?.width) || 1;
  const baseH = crop
    ? crop.height
    : (rotate === 90 || rotate === 270 ? metadata?.width : metadata?.height) || 1;

  const targetW = baseW * upscaleScale;
  const targetH = baseH * upscaleScale;

  return (
    <div className="sidebar-content">
      {/* Overview */}
      <div className="control-group">
        <label className="control-label">
          <span>AI Super Resolution</span>
        </label>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            margin: "0 0 12px 0",
          }}
        >
          Enhance and upscale images with Real-ESRGAN neural networks. Runs locally on your CPU with zero cloud transmission.
        </p>

        {/* Model Architecture Selector */}
        <label
          className="control-label"
          style={{ fontSize: "11px", marginBottom: "4px" }}
        >
          <span>Model Architecture</span>
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          {UPSCALE_MODELS.map((model) => {
            const isSelected = upscaleModel === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => setUpscaleModel(model.id as UpscaleModelType)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  border: isSelected
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-default)",
                  backgroundColor: isSelected
                    ? "var(--accent-surface)"
                    : "var(--bg-surface)",
                  color: isSelected
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "2px",
                  textAlign: "left",
                  transition: "all var(--duration-fast)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>
                    {model.id === "realesrgan-x4plus" ? "x4plus" : "Anime 6B"}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 4px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      color: "var(--accent-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {model.tag}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {model.size}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Model Status Card */}
        <div
          style={{
            padding: "10px 12px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Cpu size={14} style={{ color: "var(--accent-primary)" }} />
                <span>{currentModelInfo.name}</span>
              </div>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  margin: "4px 0 0 0",
                  lineHeight: 1.4,
                }}
              >
                {currentModelInfo.description}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "6px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "11px",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Cache Status</span>
            {isUpscaleModelReady ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "var(--success)",
                  fontWeight: 500,
                }}
              >
                <CheckCircle2 size={12} />
                Cached Offline
              </span>
            ) : (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "var(--text-secondary)",
                }}
              >
                <Download size={12} />
                Downloads on First Run ({currentModelInfo.size})
              </span>
            )}
          </div>
        </div>

        {/* Output Scale Selector */}
        <label
          className="control-label"
          style={{ fontSize: "11px", marginBottom: "4px" }}
        >
          <span>Scale Multiplier</span>
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            marginBottom: "12px",
          }}
        >
          <button
            type="button"
            className={`btn ${upscaleScale === 2 ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setUpscaleScale(2)}
            style={{
              height: "36px",
              fontSize: "13px",
              fontWeight: 600,
              justifyContent: "center",
            }}
          >
            <span>2× Upscale</span>
          </button>

          <button
            type="button"
            className={`btn ${upscaleScale === 4 ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setUpscaleScale(4)}
            style={{
              height: "36px",
              fontSize: "13px",
              fontWeight: 600,
              justifyContent: "center",
            }}
          >
            <span>4× Upscale</span>
          </button>
        </div>

        {/* Dimension Preview */}
        {hasImage && (
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              {baseW} × {baseH}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent-primary)" }}>
              <ArrowUpRight size={13} />
              <span style={{ fontWeight: 600 }}>{upscaleScale}×</span>
            </div>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {targetW} × {targetH}
            </span>
          </div>
        )}

        {/* Action Button */}
        {error && !isUpscaleLoading && (
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "var(--radius-md)",
              color: "var(--error)",
              fontSize: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <AlertCircle size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {isUpscaleActive ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={restoreUpscale}
              style={{
                width: "100%",
                height: "38px",
                justifyContent: "center",
              }}
            >
              <RotateCcw size={14} style={{ marginRight: "6px" }} />
              <span>Revert to Original</span>
            </button>

            {/* Split Slider Position Control */}
            <div
              style={{
                marginTop: "6px",
                padding: "10px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <SlidersHorizontal size={12} />
                  Before / After Split
                </span>
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {Math.round(splitSliderPos)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={splitSliderPos}
                onChange={(e) => setSplitSliderPos(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "var(--accent-primary)",
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                  textTransform: "uppercase",
                }}
              >
                <span>Original (Before)</span>
                <span>Upscaled (After)</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={applyUpscale}
            disabled={!hasImage || isUpscaleLoading}
            style={{
              width: "100%",
              height: "40px",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {isUpscaleLoading ? (
              <>
                <Loader2 size={16} className="spinner" style={{ marginRight: "8px" }} />
                <span>{upscaleProgress || "Upscaling..."}</span>
              </>
            ) : (
              <>
                <Sparkles size={16} style={{ marginRight: "8px" }} />
                <span>Upscale Image ({upscaleScale}×)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
