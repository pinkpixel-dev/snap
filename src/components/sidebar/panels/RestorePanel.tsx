import React from "react";
import { useImage } from "../../../context/ImageContext";
import {
  Wrench,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Loader2,
  SlidersHorizontal,
  Download,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  RESTORE_MODELS,
  RESTORE_TASKS,
  RestoreModelType,
  RestoreTaskType,
} from "../../../types/image";

export const RestorePanel: React.FC = () => {
  const {
    isRestoreActive,
    isRestoreLoading,
    restoreProgress,
    isRestoreModelReady,
    restoreTask,
    setRestoreTask,
    restoreModel,
    setRestoreModel,
    splitSliderPos,
    setSplitSliderPos,
    applyRestore,
    revertRestore,
    imagePath,
    imageDataUrl,
    error,
  } = useImage();

  const hasImage = Boolean(imagePath || imageDataUrl);
  const taskModels = RESTORE_MODELS.filter((m) => m.task === restoreTask);
  const currentModelInfo =
    RESTORE_MODELS.find((m) => m.id === restoreModel) || RESTORE_MODELS[0];
  const currentTaskInfo =
    RESTORE_TASKS.find((t) => t.id === restoreTask) || RESTORE_TASKS[0];

  return (
    <div className="sidebar-content">
      <div className="control-group">
        <label className="control-label">
          <span>AI Image Restoration</span>
        </label>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            margin: "0 0 12px 0",
          }}
        >
          Repair noisy, blurry, or artifact-heavy images with NAFNet and SCUNet neural networks. Runs locally on your CPU with zero cloud transmission.
        </p>

        {/* Task Selector */}
        <label
          className="control-label"
          style={{ fontSize: "11px", marginBottom: "4px" }}
        >
          <span>Repair Task</span>
        </label>
        <div
          role="tablist"
          aria-label="Restoration task"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
            marginBottom: "6px",
          }}
        >
          {RESTORE_TASKS.map((task) => {
            const isSelected = restoreTask === task.id;
            return (
              <button
                key={task.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                title={task.description}
                onClick={() => setRestoreTask(task.id as RestoreTaskType)}
                style={{
                  padding: "8px 6px",
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
                  fontSize: "12px",
                  fontWeight: 600,
                  transition: "background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast)",
                }}
              >
                {task.label}
              </button>
            );
          })}
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            lineHeight: 1.4,
            margin: "0 0 12px 0",
          }}
        >
          {currentTaskInfo.description}
        </p>

        {/* Model Selector for the active task */}
        <label
          className="control-label"
          style={{ fontSize: "11px", marginBottom: "4px" }}
        >
          <span>Model</span>
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: taskModels.length > 1 ? "1fr 1fr" : "1fr",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          {taskModels.map((model) => {
            const isSelected = restoreModel === model.id;
            return (
              <button
                key={model.id}
                type="button"
                aria-pressed={isSelected}
                title={model.description}
                onClick={() => setRestoreModel(model.id as RestoreModelType)}
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
                  transition: "background-color var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast)",
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
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>
                    {model.shortName}
                  </span>
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
            {isRestoreModelReady ? (
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

        {/* Resolution ceiling note */}
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
          <span>
            Restoration runs at up to 2048 px on the long edge. Larger images are scaled down first, and the restored result is what gets exported.
          </span>
        </div>

        {error && !isRestoreLoading && (
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
          onClick={applyRestore}
          disabled={!hasImage || isRestoreLoading}
          style={{
            width: "100%",
            height: "40px",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {isRestoreLoading ? (
            <>
              <Loader2 size={16} className="spinner" style={{ marginRight: "8px" }} />
              <span>{restoreProgress || "Restoring..."}</span>
            </>
          ) : (
            <>
              <Wrench size={16} style={{ marginRight: "8px" }} />
              <span>
                {isRestoreActive
                  ? `Run ${currentTaskInfo.label} on Result`
                  : `${currentTaskInfo.label} Image`}
              </span>
            </>
          )}
        </button>

        {isRestoreActive && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              Each run stacks on the current result, so you can denoise a restored image or deblur a denoised one. Revert to start over from the original.
            </p>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={revertRestore}
              disabled={isRestoreLoading}
              style={{
                width: "100%",
                height: "38px",
                justifyContent: "center",
              }}
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
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {Math.round(splitSliderPos)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={splitSliderPos}
                aria-label="Before and after split position"
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
                <span>Restored (After)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
