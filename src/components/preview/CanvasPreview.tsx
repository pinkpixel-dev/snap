import React, { useRef, useState, useEffect, useCallback } from "react";
import { useImage } from "../../context/ImageContext";
import { COMMON_ASPECT_RATIOS, CropSettings } from "../../types/image";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Eye,
  EyeOff,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

type DragHandleType =
  | "move"
  | "create"
  | "handle-n"
  | "handle-s"
  | "handle-w"
  | "handle-e"
  | "handle-nw"
  | "handle-ne"
  | "handle-sw"
  | "handle-se";

export const CanvasPreview: React.FC = () => {
  const {
    imageDataUrl,
    metadata,
    crop,
    setCrop,
    aspectRatioMode,
    rotate,
    flipH,
    flipV,
    showCheckerboard,
    setShowCheckerboard,
    showBeforeAfter,
    setShowBeforeAfter,
    isCutoutActive,
    cutoutDataUrl,
    isUpscaleActive,
    upscaleDataUrl,
    upscaleScale,
    splitSliderPos,
    setSplitSliderPos,
    isSidebarOpen,
    toggleSidebar,
  } = useImage();

  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isFit, setIsFit] = useState<boolean>(true);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const handleSliderPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSlider(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSliderPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSlider || !imageWrapperRef.current) return;
    const rect = imageWrapperRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clientX = e.clientX;
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    setSplitSliderPos(percentage);
  };

  const handleSliderPointerUp = (e: React.PointerEvent) => {
    if (isDraggingSlider) {
      setIsDraggingSlider(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Active drag state
  const [dragState, setDragState] = useState<{
    mode: DragHandleType;
    startX: number;
    startY: number;
    initialCrop: CropSettings;
  } | null>(null);

  // Source dimensions accounting for 90-deg rotation
  const sourceW = (rotate === 90 || rotate === 270) ? metadata?.height || 1 : metadata?.width || 1;
  const sourceH = (rotate === 90 || rotate === 270) ? metadata?.width || 1 : metadata?.height || 1;

  // Auto-fit image to container
  const updateFitZoom = useCallback(() => {
    if (!containerRef.current || !metadata) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const pad = 48;
    const availW = Math.max(100, clientWidth - pad);
    const availH = Math.max(100, clientHeight - pad);

    const scaleW = availW / sourceW;
    const scaleH = availH / sourceH;
    const fitScale = Math.min(scaleW, scaleH, 1);
    setZoom(fitScale);
    setIsFit(true);
  }, [metadata, sourceW, sourceH]);

  useEffect(() => {
    updateFitZoom();
    window.addEventListener("resize", updateFitZoom);
    return () => window.removeEventListener("resize", updateFitZoom);
  }, [updateFitZoom]);

  // Recalculate fit zoom when sidebar toggles to maximize canvas
  useEffect(() => {
    if (isFit) {
      const raf = requestAnimationFrame(() => {
        updateFitZoom();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isSidebarOpen, isFit, updateFitZoom]);

  const handleZoomIn = () => {
    setIsFit(false);
    setZoom((z) => Math.min(5, z * 1.25));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setZoom((z) => Math.max(0.1, z / 1.25));
  };

  const handleToggleFit = () => {
    if (isFit) {
      setIsFit(false);
      setZoom(1);
    } else {
      updateFitZoom();
    }
  };

  // Convert client viewport coordinates to source image coordinates
  const getSourceCoords = useCallback((clientX: number, clientY: number) => {
    const imgElem = containerRef.current?.querySelector(".preview-image") as HTMLImageElement | null;
    if (!imgElem) return { x: 0, y: 0 };

    const rect = imgElem.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const scaleX = sourceW / rect.width;
    const scaleY = sourceH / rect.height;

    const x = Math.max(0, Math.min(sourceW, Math.round(clickX * scaleX)));
    const y = Math.max(0, Math.min(sourceH, Math.round(clickY * scaleY)));

    return { x, y };
  }, [sourceW, sourceH]);

  // Handle start of handle drag or move
  const startDragHandle = (e: React.MouseEvent | React.TouchEvent, mode: DragHandleType) => {
    e.stopPropagation();
    e.preventDefault();
    if (!imageDataUrl || showBeforeAfter) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const coords = getSourceCoords(clientX, clientY);

    const activeCrop = crop || {
      x: 0,
      y: 0,
      width: sourceW,
      height: sourceH,
    };

    setDragState({
      mode,
      startX: coords.x,
      startY: coords.y,
      initialCrop: { ...activeCrop },
    });
  };

  // Handle clicking on background to draw a new crop box
  const handleBackgroundDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!imageDataUrl || showBeforeAfter) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const coords = getSourceCoords(clientX, clientY);

    setDragState({
      mode: "create",
      startX: coords.x,
      startY: coords.y,
      initialCrop: { x: coords.x, y: coords.y, width: 0, height: 0 },
    });
    setCrop({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  // Window-level drag movement listener
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const coords = getSourceCoords(clientX, clientY);
      const deltaX = coords.x - dragState.startX;
      const deltaY = coords.y - dragState.startY;

      const { mode, initialCrop } = dragState;
      const x0 = initialCrop.x;
      const y0 = initialCrop.y;
      const w0 = initialCrop.width;
      const h0 = initialCrop.height;

      const opt = COMMON_ASPECT_RATIOS.find((r) => r.id === aspectRatioMode);
      const fixedRatio = opt?.ratio || null;

      let nextCrop: CropSettings = { ...initialCrop };

      switch (mode) {
        case "move": {
          const newX = Math.max(0, Math.min(sourceW - w0, x0 + deltaX));
          const newY = Math.max(0, Math.min(sourceH - h0, y0 + deltaY));
          nextCrop = { x: newX, y: newY, width: w0, height: h0 };
          break;
        }

        case "handle-e": {
          // Drag right side
          let newW = Math.max(16, Math.min(sourceW - x0, w0 + deltaX));
          let newH = h0;
          if (fixedRatio) {
            newH = Math.round(newW / fixedRatio);
            if (y0 + newH > sourceH) {
              newH = sourceH - y0;
              newW = Math.round(newH * fixedRatio);
            }
          }
          nextCrop = { x: x0, y: y0, width: newW, height: newH };
          break;
        }

        case "handle-w": {
          // Drag left side
          const maxLeft = x0 + w0 - 16;
          let newX = Math.max(0, Math.min(maxLeft, x0 + deltaX));
          let newW = w0 + (x0 - newX);
          let newH = h0;
          if (fixedRatio) {
            newH = Math.round(newW / fixedRatio);
            if (y0 + newH > sourceH) {
              newH = sourceH - y0;
              newW = Math.round(newH * fixedRatio);
              newX = x0 + w0 - newW;
            }
          }
          nextCrop = { x: newX, y: y0, width: newW, height: newH };
          break;
        }

        case "handle-s": {
          // Drag bottom side
          let newH = Math.max(16, Math.min(sourceH - y0, h0 + deltaY));
          let newW = w0;
          if (fixedRatio) {
            newW = Math.round(newH * fixedRatio);
            if (x0 + newW > sourceW) {
              newW = sourceW - x0;
              newH = Math.round(newW / fixedRatio);
            }
          }
          nextCrop = { x: x0, y: y0, width: newW, height: newH };
          break;
        }

        case "handle-n": {
          // Drag top side
          const maxTop = y0 + h0 - 16;
          let newY = Math.max(0, Math.min(maxTop, y0 + deltaY));
          let newH = h0 + (y0 - newY);
          let newW = w0;
          if (fixedRatio) {
            newW = Math.round(newH * fixedRatio);
            if (x0 + newW > sourceW) {
              newW = sourceW - x0;
              newH = Math.round(newW / fixedRatio);
              newY = y0 + h0 - newH;
            }
          }
          nextCrop = { x: x0, y: newY, width: newW, height: newH };
          break;
        }

        case "handle-se": {
          // Bottom-right corner
          let newW = Math.max(16, Math.min(sourceW - x0, w0 + deltaX));
          let newH = Math.max(16, Math.min(sourceH - y0, h0 + deltaY));
          if (fixedRatio) {
            const byW = Math.round(newW / fixedRatio);
            if (y0 + byW <= sourceH) {
              newH = byW;
            } else {
              newH = sourceH - y0;
              newW = Math.round(newH * fixedRatio);
            }
          }
          nextCrop = { x: x0, y: y0, width: newW, height: newH };
          break;
        }

        case "handle-sw": {
          // Bottom-left corner
          const maxLeft = x0 + w0 - 16;
          let newX = Math.max(0, Math.min(maxLeft, x0 + deltaX));
          let newW = w0 + (x0 - newX);
          let newH = Math.max(16, Math.min(sourceH - y0, h0 + deltaY));
          if (fixedRatio) {
            newH = Math.round(newW / fixedRatio);
            if (y0 + newH > sourceH) {
              newH = sourceH - y0;
              newW = Math.round(newH * fixedRatio);
              newX = x0 + w0 - newW;
            }
          }
          nextCrop = { x: newX, y: y0, width: newW, height: newH };
          break;
        }

        case "handle-ne": {
          // Top-right corner
          let newW = Math.max(16, Math.min(sourceW - x0, w0 + deltaX));
          const maxTop = y0 + h0 - 16;
          let newY = Math.max(0, Math.min(maxTop, y0 + deltaY));
          let newH = h0 + (y0 - newY);
          if (fixedRatio) {
            newH = Math.round(newW / fixedRatio);
            if (y0 + h0 - newH < 0) {
              newH = y0 + h0;
              newW = Math.round(newH * fixedRatio);
            }
            newY = y0 + h0 - newH;
          }
          nextCrop = { x: x0, y: newY, width: newW, height: newH };
          break;
        }

        case "handle-nw": {
          // Top-left corner
          const maxLeft = x0 + w0 - 16;
          let newX = Math.max(0, Math.min(maxLeft, x0 + deltaX));
          let newW = w0 + (x0 - newX);
          const maxTop = y0 + h0 - 16;
          let newY = Math.max(0, Math.min(maxTop, y0 + deltaY));
          let newH = h0 + (y0 - newY);
          if (fixedRatio) {
            newH = Math.round(newW / fixedRatio);
            if (y0 + h0 - newH < 0) {
              newH = y0 + h0;
              newW = Math.round(newH * fixedRatio);
              newX = x0 + w0 - newW;
            }
            newY = y0 + h0 - newH;
          }
          nextCrop = { x: newX, y: newY, width: newW, height: newH };
          break;
        }

        case "create": {
          // Draw from scratch
          const startX = dragState.startX;
          const startY = dragState.startY;
          let w = Math.abs(coords.x - startX);
          let h = Math.abs(coords.y - startY);

          if (fixedRatio) {
            h = Math.round(w / fixedRatio);
            if (coords.y < startY ? startY - h < 0 : startY + h > sourceH) {
              h = Math.abs(coords.y - startY);
              w = Math.round(h * fixedRatio);
            }
          }

          const x = coords.x < startX ? Math.max(0, startX - w) : startX;
          const y = coords.y < startY ? Math.max(0, startY - h) : startY;

          const clampedW = Math.min(w, sourceW - x);
          const clampedH = Math.min(h, sourceH - y);

          nextCrop = { x, y, width: clampedW, height: clampedH };
          break;
        }
      }

      setCrop(nextCrop);
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [dragState, getSourceCoords, aspectRatioMode, setCrop, sourceW, sourceH]);

  return (
    <div className="preview-area">
      {/* Canvas Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              minWidth: "44px",
              textAlign: "center",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${isFit ? "active" : ""}`}
            onClick={handleToggleFit}
            style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
            title="Fit to view"
          >
            <Maximize2 size={13} style={{ marginRight: "4px" }} />
            <span>Fit</span>
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className={`btn btn-secondary ${showCheckerboard ? "active" : ""}`}
            onClick={() => setShowCheckerboard((prev) => !prev)}
            style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
            title="Toggle transparency background"
          >
            <Grid size={13} style={{ marginRight: "4px" }} />
            <span>Grid</span>
          </button>

          <button
            type="button"
            className={`btn btn-secondary ${showBeforeAfter ? "active" : ""}`}
            onClick={() => setShowBeforeAfter((prev) => !prev)}
            style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
            title="Toggle original comparison"
          >
            {showBeforeAfter ? (
              <EyeOff size={13} style={{ marginRight: "4px" }} />
            ) : (
              <Eye size={13} style={{ marginRight: "4px" }} />
            )}
            <span>{showBeforeAfter ? "Show Edits" : "Compare"}</span>
          </button>

          <button
            type="button"
            className={`btn btn-secondary ${!isSidebarOpen ? "active" : ""}`}
            onClick={toggleSidebar}
            style={{ height: "28px", padding: "0 8px", fontSize: "11px" }}
            title={isSidebarOpen ? "Hide sidebar (Ctrl+\\)" : "Show sidebar (Ctrl+\\)"}
          >
            {isSidebarOpen ? (
              <PanelRightClose size={13} style={{ marginRight: "4px" }} />
            ) : (
              <PanelRightOpen size={13} style={{ marginRight: "4px" }} />
            )}
            <span>{isSidebarOpen ? "Hide Panel" : "Show Panel"}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        className={`preview-viewport ${showCheckerboard ? "checkerboard-bg" : ""}`}
        onMouseDown={handleBackgroundDown}
        onTouchStart={handleBackgroundDown}
      >
        {imageDataUrl && (
          <div
            ref={imageWrapperRef}
            style={{
              position: "relative",
              width: `${sourceW * zoom}px`,
              height: `${sourceH * zoom}px`,
              userSelect: "none",
            }}
          >
            {isUpscaleActive && upscaleDataUrl ? (
              <>
                {/* Upscaled (After) Image Layer */}
                <img
                  src={showBeforeAfter ? (isCutoutActive && cutoutDataUrl ? cutoutDataUrl : imageDataUrl) : upscaleDataUrl}
                  alt="Upscaled preview"
                  className="preview-image"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: showBeforeAfter
                      ? "none"
                      : `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    transition: "transform 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "block",
                    pointerEvents: "none",
                  }}
                />

                {/* Original (Before) Image Layer - Clipped by split slider position */}
                {!showBeforeAfter && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      clipPath: `inset(0 ${100 - splitSliderPos}% 0 0)`,
                      pointerEvents: "none",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={isCutoutActive && cutoutDataUrl ? cutoutDataUrl : imageDataUrl}
                      alt="Original unedited preview"
                      className="preview-image"
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        transition: "transform 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "block",
                      }}
                    />
                  </div>
                )}

                {/* Split Slider Divider and Drag Handle */}
                {!showBeforeAfter && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${splitSliderPos}%`,
                      transform: "translateX(-50%)",
                      width: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "col-resize",
                      zIndex: 10,
                      touchAction: "none",
                      userSelect: "none",
                    }}
                    onPointerDown={handleSliderPointerDown}
                    onPointerMove={handleSliderPointerMove}
                    onPointerUp={handleSliderPointerUp}
                    onPointerCancel={handleSliderPointerUp}
                    tabIndex={0}
                    role="slider"
                    aria-valuenow={Math.round(splitSliderPos)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Before and after split slider"
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        setSplitSliderPos((p) => Math.max(0, p - 2));
                      } else if (e.key === "ArrowRight") {
                        e.preventDefault();
                        setSplitSliderPos((p) => Math.min(100, p + 2));
                      } else if (e.key === "Home") {
                        e.preventDefault();
                        setSplitSliderPos(0);
                      } else if (e.key === "End") {
                        e.preventDefault();
                        setSplitSliderPos(100);
                      }
                    }}
                  >
                    {/* Vertical Hairline */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: "50%",
                        width: "2px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 4px rgba(0,0,0,0.8)",
                        pointerEvents: "none",
                      }}
                    />
                    {/* Centered Circular Grip */}
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: "var(--bg-elevated)",
                        border: "1.5px solid #ffffff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-primary)",
                        fontSize: "10px",
                        fontWeight: 700,
                        pointerEvents: "none",
                      }}
                    >
                      <span>◀▶</span>
                    </div>
                  </div>
                )}

                {/* Comparison Badges */}
                {!showBeforeAfter && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        padding: "4px 8px",
                        backgroundColor: "rgba(17, 17, 19, 0.85)",
                        backdropFilter: "blur(6px)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                        pointerEvents: "none",
                        zIndex: 5,
                      }}
                    >
                      BEFORE (ORIGINAL)
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        padding: "4px 8px",
                        backgroundColor: "rgba(17, 17, 19, 0.85)",
                        backdropFilter: "blur(6px)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--accent-primary)",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-primary)",
                        fontWeight: 600,
                        pointerEvents: "none",
                        zIndex: 5,
                      }}
                    >
                      AFTER (UPSCALED {upscaleScale}×)
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Standard Base Image */}
                <img
                  src={!showBeforeAfter && isCutoutActive && cutoutDataUrl ? cutoutDataUrl : imageDataUrl}
                  alt="Source preview"
                  className="preview-image"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: showBeforeAfter
                      ? "none"
                      : `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    transition: "transform 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "block",
                    pointerEvents: "none",
                  }}
                />

                {/* Before / Original Indicator */}
                {showBeforeAfter && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      padding: "4px 8px",
                      backgroundColor: "rgba(17, 17, 19, 0.75)",
                      backdropFilter: "blur(4px)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-primary)",
                      pointerEvents: "none",
                    }}
                  >
                    ORIGINAL (UNEDITED)
                  </div>
                )}
              </>
            )}

            {/* Interactive Crop Rectangle Overlay */}
            {!showBeforeAfter && crop && crop.width > 0 && crop.height > 0 && (
              <div
                className="crop-box-container"
                style={{
                  left: `${crop.x * zoom}px`,
                  top: `${crop.y * zoom}px`,
                  width: `${crop.width * zoom}px`,
                  height: `${crop.height * zoom}px`,
                }}
                onMouseDown={(e) => startDragHandle(e, "move")}
                onTouchStart={(e) => startDragHandle(e, "move")}
              >
                {/* Rule of thirds grid lines */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gridTemplateRows: "1fr 1fr 1fr",
                    opacity: 0.35,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ borderRight: "1px dashed #ffffff", borderBottom: "1px dashed #ffffff" }} />
                  <div style={{ borderRight: "1px dashed #ffffff", borderBottom: "1px dashed #ffffff" }} />
                  <div style={{ borderBottom: "1px dashed #ffffff" }} />
                  <div style={{ borderRight: "1px dashed #ffffff", borderBottom: "1px dashed #ffffff" }} />
                  <div style={{ borderRight: "1px dashed #ffffff", borderBottom: "1px dashed #ffffff" }} />
                  <div style={{ borderBottom: "1px dashed #ffffff" }} />
                  <div style={{ borderRight: "1px dashed #ffffff" }} />
                  <div style={{ borderRight: "1px dashed #ffffff" }} />
                  <div />
                </div>

                {/* 4 Edge Handles (North, South, West, East) */}
                <div
                  className="crop-handle-side-h crop-handle-n"
                  title="Drag top edge"
                  onMouseDown={(e) => startDragHandle(e, "handle-n")}
                  onTouchStart={(e) => startDragHandle(e, "handle-n")}
                />
                <div
                  className="crop-handle-side-h crop-handle-s"
                  title="Drag bottom edge"
                  onMouseDown={(e) => startDragHandle(e, "handle-s")}
                  onTouchStart={(e) => startDragHandle(e, "handle-s")}
                />
                <div
                  className="crop-handle-side-v crop-handle-w"
                  title="Drag left edge"
                  onMouseDown={(e) => startDragHandle(e, "handle-w")}
                  onTouchStart={(e) => startDragHandle(e, "handle-w")}
                />
                <div
                  className="crop-handle-side-v crop-handle-e"
                  title="Drag right edge"
                  onMouseDown={(e) => startDragHandle(e, "handle-e")}
                  onTouchStart={(e) => startDragHandle(e, "handle-e")}
                />

                {/* 4 Corner Handles (NW, NE, SW, SE) */}
                <div
                  className="crop-handle-corner crop-handle-nw"
                  title="Drag top-left corner"
                  onMouseDown={(e) => startDragHandle(e, "handle-nw")}
                  onTouchStart={(e) => startDragHandle(e, "handle-nw")}
                />
                <div
                  className="crop-handle-corner crop-handle-ne"
                  title="Drag top-right corner"
                  onMouseDown={(e) => startDragHandle(e, "handle-ne")}
                  onTouchStart={(e) => startDragHandle(e, "handle-ne")}
                />
                <div
                  className="crop-handle-corner crop-handle-sw"
                  title="Drag bottom-left corner"
                  onMouseDown={(e) => startDragHandle(e, "handle-sw")}
                  onTouchStart={(e) => startDragHandle(e, "handle-sw")}
                />
                <div
                  className="crop-handle-corner crop-handle-se"
                  title="Drag bottom-right corner"
                  onMouseDown={(e) => startDragHandle(e, "handle-se")}
                  onTouchStart={(e) => startDragHandle(e, "handle-se")}
                />

                {/* Dimension label badge on crop */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-24px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "2px 6px",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {crop.width} × {crop.height} px
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
