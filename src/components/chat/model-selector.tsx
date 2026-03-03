"use client";

import { memo, useCallback, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  ModelSelector as ModelSelectorRoot,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { cn } from "@/lib/utils";
import type { AIModel } from "@/lib/ai-models";

// ─── Provider slug → models.dev logo slug mapping ───
const logoSlugMap: Record<string, string> = {
  openai: "openai",
  google: "google",
  xai: "xai",
  deepseek: "deepseek",
  meta: "llama",
  mistral: "mistral",
  groq: "groq",
};

// ─── Individual model item (memoized) ───
interface ModelItemProps {
  model: AIModel;
  selectedModelId: string;
  onSelect: (id: string) => void;
}

const ModelItem = memo(function ModelItem({
  model,
  selectedModelId,
  onSelect,
}: ModelItemProps) {
  const isSelected = model.id === selectedModelId;
  const logoSlug = logoSlugMap[model.providerSlug] ?? model.providerSlug;

  return (
    <ModelSelectorItem
      value={`${model.name} ${model.provider} ${model.description}`}
      onSelect={() => onSelect(model.id)}
      className={cn(
        "flex items-center gap-2.5 py-2 cursor-pointer",
        isSelected && "bg-[#D4A574]/5",
      )}
    >
      <ModelSelectorLogo
        provider={logoSlug}
        className="size-4 shrink-0 dark:invert"
      />
      <div className="flex-1 min-w-0">
        <ModelSelectorName className="text-sm font-medium">
          {model.name}
        </ModelSelectorName>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
          {model.description}
        </p>
      </div>
      {isSelected && (
        <Check className="size-3.5 text-[#D4A574] shrink-0" />
      )}
    </ModelSelectorItem>
  );
});

// ─── Main component ───
interface ModelSelectorProps {
  models: AIModel[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export const ModelSelector = memo(function ModelSelector({
  models,
  selectedModelId,
  onModelChange,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === selectedModelId) ?? models[0];
  const selectedLogoSlug =
    logoSlugMap[selected.providerSlug] ?? selected.providerSlug;

  // Group models by provider (preserving order of first appearance)
  const providers = [...new Set(models.map((m) => m.provider))];

  const handleSelect = useCallback(
    (id: string) => {
      onModelChange(id);
      setOpen(false);
    },
    [onModelChange],
  );

  return (
    <ModelSelectorRoot open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
            "bg-muted/50 hover:bg-muted border border-border/30",
            "transition-colors focus:outline-none focus:ring-1 focus:ring-[#D4A574]/30",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <ModelSelectorLogo
            provider={selectedLogoSlug}
            className="size-3.5 dark:invert"
          />
          <span className="truncate max-w-[100px]">{selected.name}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Pilih Model AI">
        <ModelSelectorInput placeholder="Cari model..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>Model tidak ditemukan.</ModelSelectorEmpty>
          {providers.map((provider) => (
            <ModelSelectorGroup heading={provider} key={provider}>
              {models
                .filter((m) => m.provider === provider)
                .map((model) => (
                  <ModelItem
                    key={model.id}
                    model={model}
                    selectedModelId={selectedModelId}
                    onSelect={handleSelect}
                  />
                ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
});
