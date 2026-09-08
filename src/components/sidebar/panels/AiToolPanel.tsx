import React from "react";
import {
  RotateCcw,
  CheckCircle2,
  Cpu,
  Loader2,
  SlidersHorizontal,
  Download,
  AlertCircle,
  Info,
  LucideIcon,
} from "lucide-react";

export interface AiToolModelOption {
  id: string;
  shortName: string;
  tag: string;
  size: string;
  description: string;
}

interface AiToolPanelProps {
  title: string;
  blurb: string;
  icon: LucideIcon;
  /** Omit for single-model tools. */
  models?: AiToolModelOption[];
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  modelName: string;
  modelDescription: string;
  modelSize: string;
  isModelReady: boolean;
  note?: string;
  hasImage: boolean;
  isActive: boolean;
  isLoading: boolean;
  progress: string | null;
  loadingLabel: string;
  actionLabel: string;
  activeActionLabel: string;
  stackHint: string;
  afterLabel: string;
  error: string | null;
  splitSliderPos: number;
  setSplitSliderPos: (pos: number) => void;
  onApply: () => void;
  onRevert: () => void;
}

/**
 * Shared layout for the model-backed sidebar tools: model choice, cache status,
 * run button, and the before/after split control once a pass has been applied.
 */
export const AiToolPanel: React.FC<AiToolPanelProps> = ({
  title,
  blurb,
  icon: Icon,
  models,
  selectedModelId,
  onSelectModel,
  modelName,
  modelDescription,
  modelSize,
  isModelReady,
  note,
  hasImage,
  isActive,
  isLoading,
  progress,
  loadingLabel,
  actionLabel,
  activeActionLabel,
  stackHint,
  afterLabel,
  error,
  splitSliderPos,
  setSplitSliderPos,
  onApply,
  onRevert,
}) => {
  return (
    <div className="sidebar-content">
      <div className="control-group">
        <label className="control-label">
          <span>{title}</span>
        </label>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            margin: "0 0 12px 0",
          }}
        >
          {blurb}
        </p>

        {models && models.length > 1 && (
          <>
            <label className="control-label" style={{ fontSize: "11px", marginBottom: "4px" }}>
              <span>Model</span>
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                marginBottom: "10px",
              }}
            >
              {models.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    aria-pressed={isSelected}
                    title={model.description}
                    onClick={() => onSelectModel?.(model.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-md)",
                      border: isSelected
                        ? "1px solid var(--accent-primary)"
                        : "1px solid var(--border-default)",
                      backgroundColor: isSelected ? "var(--accent-surface)" : "var(--bg-surface)",
                      color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "2px",
                      textAlign: "left",
                      transition:
                        "background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        gap: "6px",
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>{model.shortName}</span>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(59, 130, 246, 0.15)",
                          color: "var(--accent-primary)",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
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
          </>
        )}

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
              <span>{modelName}</span>
            </div>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                margin: "4px 0 0 0",
                lineHeight: 1.4,
              }}
            >
              {modelDescription}
            </p>
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
            {isModelReady ? (
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
                Downloads on First Run ({modelSize})
              </span>
            )}
          </div>
        </div>

        {note && (
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "11px",
              color: "var(--text-muted)",
              lineHeight: 1.4,
              marginBottom: "12px",
            }}
          >
            <Info size={13} style={{ marginTop: "1px", flexShrink: 0 }} />
            <span>{note}</span>
          </div>
        )}

        {error && !isLoading && (
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

        <button
          type="button"
          className="btn btn-primary"
          onClick={onApply}
          disabled={!hasImage || isLoading}
          style={{
            width: "100%",
            height: "40px",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="spinner" style={{ marginRight: "8px" }} />
              <span>{progress || loadingLabel}</span>
            </>
          ) : (
            <>
              <Icon size={16} style={{ marginRight: "8px" }} />
              <span>{isActive ? activeActionLabel : actionLabel}</span>
            </>
          )}
        </button>

        {isActive && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {stackHint}
            </p>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRevert}
              disabled={isLoading}
              style={{ width: "100%", height: "38px", justifyContent: "center" }}
            >
              <RotateCcw size={14} style={{ marginRight: "6px" }} />
              <span>Revert to Original</span>
            </button>

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
                <span style={{ fontFamily: "var(--font-mono)" }}>{Math.round(splitSliderPos)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={splitSliderPos}
                aria-label="Before and after split position"
                onChange={(e) => setSplitSliderPos(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-primary)", cursor: "pointer" }}
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
                <span>{afterLabel}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
