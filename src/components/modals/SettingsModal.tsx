import React, { useState } from "react";
import { useImage } from "../../context/ImageContext";
import {
  Settings,
  X,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Trash2,
} from "lucide-react";
import { CUTOUT_MODELS, CutoutModelType } from "../../types/image";

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    hfToken,
    setHfToken,
    cutoutModel,
    setCutoutModel,
    isModelReady,
  } = useImage();

  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState(hfToken);
  const [justSaved, setJustSaved] = useState(false);

  if (!isSettingsModalOpen) return null;

  const handleSaveToken = () => {
    setHfToken(tokenInput.trim());
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleClearToken = () => {
    setTokenInput("");
    setHfToken("");
  };

  return (
    <div className="modal-overlay" onClick={closeSettingsModal}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings size={18} color="var(--accent-primary)" />
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Settings
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={closeSettingsModal}
            style={{ width: "26px", height: "26px" }}
            title="Close settings"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ gap: "20px" }}>
          {/* Hugging Face Token Section */}
          <div className="control-group">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <label
                className="control-label"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Key size={14} color="var(--accent-teal)" />
                  Hugging Face Access Token
                </span>
              </label>

              {hfToken ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    color: "var(--success)",
                    fontWeight: 500,
                  }}
                >
                  <CheckCircle2 size={12} />
                  Token configured
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  Optional
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: 1.45,
                margin: "0 0 10px 0",
              }}
            >
              Required for downloading official gated models such as{" "}
              <strong>RMBG 2.0 (Bria AI)</strong>. Not required for public models like{" "}
              <strong>Lucida ONNX</strong>, <strong>BiRefNet HR Matting</strong>, or{" "}
              <strong>FeyNobg ONNX</strong>. Your token is stored locally on this
              machine and never shared.
            </p>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type={showToken ? "text" : "password"}
                  className="input-field"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="hf_..."
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    paddingRight: "36px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? "Hide token" : "Show token"}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveToken}
                disabled={tokenInput === hfToken && !justSaved}
                style={{
                  height: "32px",
                  fontSize: "12px",
                  fontWeight: 500,
                  padding: "0 12px",
                  flexShrink: 0,
                }}
              >
                {justSaved ? "Saved!" : "Save"}
              </button>

              {tokenInput && (
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  onClick={handleClearToken}
                  title="Remove token"
                  style={{
                    height: "32px",
                    width: "32px",
                    flexShrink: 0,
                    color: "var(--text-muted)",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
              }}
            >
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--accent-teal)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>Create a Hugging Face user token (Read role)</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          <div
            style={{
              height: "1px",
              backgroundColor: "var(--border-subtle)",
              margin: "0 -20px",
            }}
          />

          {/* Model Selection Section */}
          <div className="control-group">
            <label
              className="control-label"
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "4px",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Cpu size={14} color="var(--accent-teal)" />
                Default Background Removal Model
              </span>
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {CUTOUT_MODELS.map((model) => {
                const isSelected = cutoutModel === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setCutoutModel(model.id as CutoutModelType)}
                    style={{
                      padding: "12px",
                      borderRadius: "var(--radius-md)",
                      border: isSelected
                        ? "1px solid var(--accent-primary)"
                        : "1px solid var(--border-default)",
                      backgroundColor: isSelected
                        ? "var(--accent-surface)"
                        : "var(--bg-surface)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      transition: "all var(--duration-fast)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "13px",
                          color: isSelected
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>{model.name}</span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: model.isGated
                              ? "rgba(234, 179, 8, 0.15)"
                              : "rgba(34, 197, 94, 0.15)",
                            color: model.isGated
                              ? "var(--warning)"
                              : "var(--success)",
                            fontWeight: 500,
                          }}
                        >
                          {model.tag}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {model.size}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      {model.description}
                    </p>

                    {isSelected && (
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "11px",
                          color: isModelReady ? "var(--success)" : "var(--accent-teal)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>
                          {isModelReady
                            ? "Ready (cached locally on your device)"
                            : "Will download on first subject isolation"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={closeSettingsModal}
            style={{ minWidth: "80px" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
