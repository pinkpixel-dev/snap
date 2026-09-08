import React, { useEffect } from "react";
import { ImageProvider, useImage } from "./context/ImageContext";
import { Header } from "./components/layout/Header";
import { ImageDropzone } from "./components/dropzone/ImageDropzone";
import { CanvasPreview } from "./components/preview/CanvasPreview";
import { ToolSidebar } from "./components/sidebar/ToolSidebar";
import { ExportModal } from "./components/export/ExportModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { open } from "@tauri-apps/plugin-dialog";

const SnapWorkspace: React.FC = () => {
  const { metadata, loadImageFromPath, openExportModal, openSettingsModal, toggleSidebar } = useImage();

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+\ / Cmd+\ or Ctrl+B / Cmd+B: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && (e.key === "\\" || e.key.toLowerCase() === "b")) {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // Ctrl+O / Cmd+O: Open file
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
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
          console.warn("Could not open file picker:", err);
        }
      }

      // Ctrl+S / Cmd+S: Export
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (metadata) {
          openExportModal();
        }
      }

      // Ctrl+, / Cmd+,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        openSettingsModal();
      }

      // Escape: Close/reset
      if (e.key === "Escape") {
        // If an edit is active, reset; if none, clear
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [metadata, loadImageFromPath, openExportModal, openSettingsModal, toggleSidebar]);

  return (
    <div className="app-container">
      <Header />

      {metadata ? (
        <main className="workspace-container">
          <CanvasPreview />
          <ToolSidebar />
        </main>
      ) : (
        <main className="workspace-container" style={{ alignItems: "center", justifyContent: "center" }}>
          <ImageDropzone />
        </main>
      )}

      <ExportModal />
      <SettingsModal />
    </div>
  );
};

export function App() {
  return (
    <ImageProvider>
      <SnapWorkspace />
    </ImageProvider>
  );
}

export default App;
