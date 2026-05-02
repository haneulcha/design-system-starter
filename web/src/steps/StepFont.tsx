import { useEffect, useState } from "react";
import type { DesignSystem } from "@core/schema/types.js";
import type { PresetName } from "../hooks/useGenerator";
import { loadGoogleFont } from "../lib/tokens";
import { TypeScale } from "../components/TypeScale";

interface FontSuggestion { name: string; fallback: string }

const SUGGESTED_FONTS: Record<PresetName, FontSuggestion[]> = {
  "clean-minimal":    [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "Geist", fallback: "system-ui, sans-serif" }, { name: "Manrope", fallback: "system-ui, sans-serif" }],
  "warm-friendly":    [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "DM Sans", fallback: "system-ui, sans-serif" }, { name: "Plus Jakarta Sans", fallback: "system-ui, sans-serif" }],
  "bold-energetic":   [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "Space Grotesk", fallback: "system-ui, sans-serif" }, { name: "Sora", fallback: "system-ui, sans-serif" }],
  "professional":     [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "IBM Plex Sans", fallback: "system-ui, sans-serif" }, { name: "Source Sans 3", fallback: "system-ui, sans-serif" }],
  "playful-creative": [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "Outfit", fallback: "system-ui, sans-serif" }, { name: "Quicksand", fallback: "system-ui, sans-serif" }],
};

const DEFAULT_FONT: Record<PresetName, string> = {
  "clean-minimal": "Inter",
  "warm-friendly": "Inter",
  "bold-energetic": "Inter",
  "professional": "Inter",
  "playful-creative": "Inter",
};

export function StepFont({
  value,
  preset,
  onChange,
  system,
}: {
  value: string;
  preset: PresetName;
  onChange: (v: string) => void;
  system: DesignSystem | null;
}) {
  const suggestedFonts = SUGGESTED_FONTS[preset];
  const suggestedNames = suggestedFonts.map((f) => f.name);
  const isCustom = !suggestedNames.includes(value);

  const [customInput, setCustomInput] = useState(isCustom ? value : "");
  const [showCustom, setShowCustom] = useState(isCustom);

  useEffect(() => {
    if (value) loadGoogleFont(value);
  }, [value]);

  useEffect(() => {
    const newNames = SUGGESTED_FONTS[preset].map((f) => f.name);
    if (!newNames.includes(value) && !showCustom) {
      onChange(DEFAULT_FONT[preset]);
    }
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">Choose your font</h2>
      <p className="text-neutral-500 mb-8">
        Select from fonts suited to your archetype, or enter any Google Fonts family.
      </p>

      <div className="flex flex-col gap-2 mb-8">
        {suggestedFonts.map((font) => {
          const isSelected = !showCustom && value === font.name;
          return (
            <label
              key={font.name}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
                isSelected ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                           : "border-neutral-200 bg-white hover:border-neutral-400",
              ].join(" ")}
            >
              <input
                type="radio" name="font" value={font.name} checked={isSelected}
                onChange={() => { setShowCustom(false); onChange(font.name); }}
                className="accent-neutral-900"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900">{font.name}</div>
                <div
                  className="text-base text-neutral-600 truncate"
                  style={{ fontFamily: `'${font.name}', ${font.fallback}` }}
                >
                  The quick brown fox
                </div>
              </div>
            </label>
          );
        })}

        <label
          className={[
            "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
            showCustom ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                       : "border-neutral-200 bg-white hover:border-neutral-400",
          ].join(" ")}
        >
          <input
            type="radio" name="font" value="custom" checked={showCustom}
            onChange={() => { setShowCustom(true); if (customInput) onChange(customInput); }}
            className="accent-neutral-900"
          />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900">Custom</span>
            {showCustom && (
              <input
                type="text" value={customInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomInput(v);
                  if (v.trim()) onChange(v.trim());
                }}
                placeholder="e.g. Lato, Raleway, Nunito…"
                className="flex-1 text-sm px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:border-neutral-600"
                autoFocus onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </label>
      </div>

      {system && <TypeScale system={system} />}
    </div>
  );
}
