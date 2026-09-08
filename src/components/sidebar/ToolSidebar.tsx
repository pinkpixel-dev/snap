import React from "react";
import { useImage } from "../../context/ImageContext";
import { Crop, Scaling, Sparkles, Scissors, Wand2 } from "lucide-react";
import { CropPanel } from "./panels/CropPanel";
import { ResizePanel } from "./panels/ResizePanel";
import { UpscalePanel } from "./panels/UpscalePanel";
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
        {activeTab === "cutout" && <CutoutPanel />}
        {activeTab === "smart-select" && <SmartSelectPanel />}
      </div>
    </aside>
  );
};
