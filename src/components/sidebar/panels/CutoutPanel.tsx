import React from "react";
import { useImage } from "../../../context/ImageContext";
import {
  Scissors,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Loader2,
  Grid,
  ShieldCheck,
  Key,
  Settings,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { CUTOUT_MODELS, CutoutModelType } from "../../../types/image";

export const CutoutPanel: React.FC = () => {
  const {
    isCutoutActive,
    isCutoutLoading,
    cutoutProgress,
    isModelReady,
    cutoutModel,
    setCutoutModel,
    hfToken,
    openSettingsModal,
    applyBackgroundRemoval,
    restoreBackground,
    showCheckerboard,
    setShowCheckerboard,
    imagePath,
    imageDataUrl,
    error,
  } = useImage();

  const hasImage = Boolean(imagePath || imageDataUrl);
  const currentModelInfo =
    CUTOUT_MODELS.find((m) => m.id === cutoutModel) || CUTOUT_MODELS[0];

  return (
    <div className="sidebar-content">
      {/* Overview */}
      <div className="control-group">
        <label className="control-label">
          <span>AI Subject Isolation</span>
        </label>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            margin: "0 0 12px 0",
          }}
        >
          Isolate subjects with high-precision 1024×1024 ONNX neural networks.
          Runs entirely offline on your local CPU.
        </p>

        {/* Model Selector Tabs */}
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
          {CUTOUT_MODELS.map((model) => {
            const isSelected = cutoutModel === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => setCutoutModel(model.id as CutoutModelType)}
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
                    {model.shortName}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "1px 4px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: model.isGated
                        ? "rgba(234, 179, 8, 0.15)"
                        : "rgba(34, 197, 94, 0.15)",
                      color: model.isGated ? "var(--warning)" : "var(--success)",
                      fontWeight: 500,
                    }}
                  >
                    {model.tag}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {model.size}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {model.resolution}
                  </span>
                </div>
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
            fontSize: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={15} color="var(--text-secondary)" />
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                {currentModelInfo.name}
              </span>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 500,
                color: isModelReady ? "var(--success)" : "var(--text-muted)",
              }}
            >
              {isModelReady ? (
                <>
                  <CheckCircle2 size={12} color="var(--success)" />
                  Cached on device
                </>
              ) : (
                "Downloads on first use"
              )}
            </span>
          </div>

          {/* Token / Gating Notice */}
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "6px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            {currentModelInfo.isGated ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Key
                  size={12}
                  color={hfToken ? "var(--success)" : "var(--warning)"}
                />
                <span>
                  {hfToken
                    ? "HF Token linked"
                    : isModelReady
                    ? "Ready from local cache"
                    : "Gated model (needs HF Token)"}
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={12} color="var(--success)" />
                <span>Public unauthenticated model</span>
              </div>
            )}

            <button
              type="button"
              onClick={openSettingsModal}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-teal)",
                cursor: "pointer",
                padding: "2px 4px",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Settings size={11} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="control-group">
        {error && !isCutoutLoading && (
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
        {!isCutoutActive ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={applyBackgroundRemoval}
            disabled={!hasImage || isCutoutLoading}
            style={{
              width: "100%",
              height: "44px",
              fontSize: "13px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isCutoutLoading ? (
              <>
                <Loader2 size={16} className="spin-animation" />
                <span>{cutoutProgress || "Processing..."}</span>
              </>
            ) : (
              <>
                <Scissors size={16} />
                <span>Remove Background</span>
              </>
            )}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.25)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: "var(--success)",
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={15} />
              <span>Background successfully removed</span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={restoreBackground}
              style={{
                width: "100%",
                height: "44px",
                fontSize: "13px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <RotateCcw size={15} />
              <span>Restore Original Background</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick View Settings */}
      <div className="control-group">
        <label className="control-label">
          <span>Transparency View</span>
        </label>
        <button
          type="button"
          className={`btn btn-secondary ${showCheckerboard ? "active" : ""}`}
          onClick={() => setShowCheckerboard((prev) => !prev)}
          style={{
            width: "100%",
            height: "40px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Grid size={14} />
            <span>Checkerboard Grid</span>
          </span>
          <span
            style={{
              fontSize: "11px",
              color: showCheckerboard ? "var(--accent-teal)" : "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {showCheckerboard ? "Visible" : "Hidden"}
          </span>
        </button>
      </div>

      {/* Export Notes */}
      <div
        style={{
          marginTop: "auto",
          padding: "12px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          gap: "10px",
        }}
      >
        <ShieldCheck
          size={16}
          color="var(--accent-teal)"
          style={{ flexShrink: 0, marginTop: "2px" }}
        />
        <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Exporting as <strong>PNG</strong> or <strong>WebP</strong> preserves full alpha
          transparency. JPEG exports will automatically composite against your selected
          matte color.
        </div>
      </div>
    </div>
  );
};
