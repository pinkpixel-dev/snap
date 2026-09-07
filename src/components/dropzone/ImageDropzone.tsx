import React, { useState, useEffect, useRef } from "react";
import { useImage } from "../../context/ImageContext";
import { open } from "@tauri-apps/plugin-dialog";
import { UploadCloud, Image as ImageIcon, Clipboard, AlertCircle } from "lucide-react";

export const ImageDropzone: React.FC = () => {
  const { loadImageFromPath, loadImageFromDataUrl, isLoading, error } = useImage();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "bmp", "ico"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        await loadImageFromPath(selected);
      }
    } catch (err) {
      console.warn("Tauri dialog open failed, falling back to input element:", err);
      fileInputRef.current?.click();
    }
  };

  const handleHtmlFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        loadImageFromDataUrl(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                loadImageFromDataUrl(reader.result, "pasted-image.png");
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadImageFromDataUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // If files are dropped via browser/webview
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // In Tauri desktop, files might have path property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filePath = (file as any).path;
      if (filePath) {
        await loadImageFromPath(filePath);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            loadImageFromDataUrl(reader.result, file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div
      className="dropzone-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp,image/x-icon"
        style={{ display: "none" }}
        onChange={handleHtmlFileInput}
      />

      <div
        className={`dropzone-card ${isDragOver ? "drag-over" : ""}`}
        onClick={handleOpenFile}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleOpenFile();
          }
        }}
      >
        <div className="dropzone-icon-box">
          {isLoading ? (
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}>...</span>
          ) : (
            <UploadCloud size={28} />
          )}
        </div>

        <div>
          <h2 className="dropzone-title">
            {isLoading ? "Reading image..." : "Drop an image here"}
          </h2>
          <p className="dropzone-subtitle" style={{ marginTop: "4px" }}>
            or click to browse from your computer. You can also paste directly from your clipboard.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          <span className="version-badge">PNG</span>
          <span className="version-badge">JPEG</span>
          <span className="version-badge">WebP</span>
          <span className="version-badge">BMP</span>
          <span className="version-badge">ICO</span>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--danger)",
              fontSize: "12px",
              marginTop: "8px",
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          color: "var(--text-muted)",
          fontSize: "12px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <ImageIcon size={14} /> Local-first processing
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Clipboard size={14} /> Ctrl+V to paste
        </span>
      </div>
    </div>
  );
};
