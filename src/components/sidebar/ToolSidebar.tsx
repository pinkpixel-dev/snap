import React from "react";
import { useImage } from "../../context/ImageContext";
import { Crop, Scaling, Sparkles, Wrench, Sun, Palette, Scissors, Wand2 } from "lucide-react";
import { CropPanel } from "./panels/CropPanel";
import { ResizePanel } from "./panels/ResizePanel";
import { UpscalePanel } from "./panels/UpscalePanel";
import { RestorePanel } from "./panels/RestorePanel";
import { EnhancePanel } from "./panels/EnhancePanel";
import { ColorizePanel } from "./panels/ColorizePanel";
import { CutoutPanel } from "./panels/CutoutPanel";
import { SmartSelectPanel } from "./panels/SmartSelectPanel";

export const ToolSidebar: React.FC = () => {
  const { activeTab, setActiveTab, isSidebarOpen } = useImage();

  if (!isSidebarOpen) {
    return null;
  }

  const tabs = [
    { id: "crop" as const, label: "Crop", icon: Crop, title: "Crop & Rotate" },
    { id: "resize" as const, label: "Resize", icon: Scaling, title: "Resize Dimensions" },
    { id: "upscale" as const, label: "Upscale", icon: Sparkles, title: "Neural Super-Resolution" },
    { id: "restore" as const, label: "Restore", icon: Wrench, title: "Repair, Denoise & Deblur" },
    { id: "enhance" as const, label: "Light", icon: Sun, title: "Low Light & Exposure Correction" },
    { id: "colorize" as const, label: "Colorize", icon: Palette, title: "Black & White Colorization" },
    { id: "cutout" as const, label: "BG Removal", icon: Scissors, title: "Background Removal" },
    { id: "smart-select" as const, label: "Select", icon: Wand2, title: "Smart Object Selection" },
  ];

  return (
    <aside className="tool-sidebar">
      <div className="sidebar-tabs" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              className={`sidebar-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.title}
              aria-label={tab.label}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "crop" && <CropPanel />}
        {activeTab === "resize" && <ResizePanel />}
        {activeTab === "upscale" && <UpscalePanel />}
        {activeTab === "restore" && <RestorePanel />}
        {activeTab === "enhance" && <EnhancePanel />}
        {activeTab === "colorize" && <ColorizePanel />}
        {activeTab === "cutout" && <CutoutPanel />}
        {activeTab === "smart-select" && <SmartSelectPanel />}
      </div>
    </aside>
  );
};
