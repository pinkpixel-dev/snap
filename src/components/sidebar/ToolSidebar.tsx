import React from "react";
import { useImage } from "../../context/ImageContext";
import { Crop, Scaling, Sparkles, Sliders, Scissors, Shield } from "lucide-react";
import { CropPanel } from "./panels/CropPanel";
import { ResizePanel } from "./panels/ResizePanel";
import { UpscalePanel } from "./panels/UpscalePanel";
import { FormatPanel } from "./panels/FormatPanel";
import { CutoutPanel } from "./panels/CutoutPanel";
import { MetadataPanel } from "./panels/MetadataPanel";

export const ToolSidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useImage();

  const tabs = [
    { id: "crop" as const, label: "Crop", icon: Crop },
    { id: "resize" as const, label: "Resize", icon: Scaling },
    { id: "upscale" as const, label: "Upscale", icon: Sparkles },
    { id: "cutout" as const, label: "BG Removal", icon: Scissors },
    { id: "format" as const, label: "Format", icon: Sliders },
    { id: "metadata" as const, label: "Privacy", icon: Shield },
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
        {activeTab === "format" && <FormatPanel />}
        {activeTab === "metadata" && <MetadataPanel />}
      </div>
    </aside>
  );
};
