import React from "react";
import { Palette } from "lucide-react";
import { useImage } from "../../../context/ImageContext";
import { COLORIZE_MODEL } from "../../../types/image";
import { AiToolPanel } from "./AiToolPanel";

export const ColorizePanel: React.FC = () => {
  const {
    isColorizeActive,
    isColorizeLoading,
    colorizeProgress,
    isColorizeModelReady,
    splitSliderPos,
    setSplitSliderPos,
    applyColorize,
    revertColorize,
    imagePath,
    imageDataUrl,
    error,
  } = useImage();

  return (
    <AiToolPanel
      title="Colorize"
      blurb="Add color to black-and-white photos with DDColor. The model only predicts color; the lightness of your original is kept exactly as it was, so grain, texture, and detail come through untouched."
      icon={Palette}
      modelName={COLORIZE_MODEL.name}
      modelDescription={COLORIZE_MODEL.description}
      modelSize={COLORIZE_MODEL.size}
      isModelReady={isColorizeModelReady}
      note="Color is predicted at 256 px and scaled up, which is how DDColor is designed to work. Lightness stays at full resolution, up to 2048 px on the long edge."
      hasImage={Boolean(imagePath || imageDataUrl)}
      isActive={isColorizeActive}
      isLoading={isColorizeLoading}
      progress={colorizeProgress}
      loadingLabel="Colorizing..."
      actionLabel="Colorize Image"
      activeActionLabel="Colorize Again"
      stackHint="Runs on the current result, so you can colorize first and then enhance or restore. Revert to start over from the original."
      afterLabel="Colorized (After)"
      error={error}
      splitSliderPos={splitSliderPos}
      setSplitSliderPos={setSplitSliderPos}
      onApply={applyColorize}
      onRevert={revertColorize}
    />
  );
};
