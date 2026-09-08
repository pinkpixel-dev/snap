import React from "react";
import { Sun } from "lucide-react";
import { useImage } from "../../../context/ImageContext";
import { ENHANCE_MODELS, EnhanceModelType } from "../../../types/image";
import { AiToolPanel } from "./AiToolPanel";

export const EnhancePanel: React.FC = () => {
  const {
    isEnhanceActive,
    isEnhanceLoading,
    enhanceProgress,
    isEnhanceModelReady,
    enhanceModel,
    setEnhanceModel,
    splitSliderPos,
    setSplitSliderPos,
    applyEnhance,
    revertEnhance,
    imagePath,
    imageDataUrl,
    error,
  } = useImage();

  const currentModel = ENHANCE_MODELS.find((m) => m.id === enhanceModel) || ENHANCE_MODELS[0];

  return (
    <AiToolPanel
      title="Light & Exposure"
      blurb="Brighten dark photos and correct bad exposure with the Illumination Adaptive Transformer. It adjusts each pixel locally, then applies a global color and gamma correction, so results keep their original character instead of looking washed out."
      icon={Sun}
      models={ENHANCE_MODELS.map((m) => ({
        id: m.id,
        shortName: m.shortName,
        tag: m.tag,
        size: m.size,
        description: m.description,
      }))}
      selectedModelId={enhanceModel}
      onSelectModel={(id) => setEnhanceModel(id as EnhanceModelType)}
      modelName={currentModel.name}
      modelDescription={currentModel.description}
      modelSize={currentModel.size}
      isModelReady={isEnhanceModelReady}
      note="All three variants are under half a megabyte, so switching between them costs almost nothing. Runs at up to 2048 px on the long edge."
      hasImage={Boolean(imagePath || imageDataUrl)}
      isActive={isEnhanceActive}
      isLoading={isEnhanceLoading}
      progress={enhanceProgress}
      loadingLabel="Enhancing..."
      actionLabel="Enhance Image"
      activeActionLabel="Enhance Again"
      stackHint="Each run stacks on the current result, so you can enhance a colorized or restored image. Revert to start over from the original."
      afterLabel="Enhanced (After)"
      error={error}
      splitSliderPos={splitSliderPos}
      setSplitSliderPos={setSplitSliderPos}
      onApply={applyEnhance}
      onRevert={revertEnhance}
    />
  );
};
