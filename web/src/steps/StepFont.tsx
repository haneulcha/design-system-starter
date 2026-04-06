import { useEffect, useState } from "react";
import { getArchetype } from "@core/schema/archetypes.js";
import type { DesignSystem } from "@core/schema/types.js";
import type { MoodArchetype } from "../hooks/useGenerator";
import { loadGoogleFont } from "../lib/tokens";
import { TypeScale } from "../components/TypeScale";

export function StepFont({
  value,
  mood,
  onChange,
  system,
}: {
  value: string;
  mood: MoodArchetype;
  onChange: (v: string) => void;
  system: DesignSystem | null;
}) {
  const archetype = getArchetype(mood);
  const suggestedFonts = archetype.suggestedFonts;

  const suggestedNames = suggestedFonts.map((f) => f.name);
  const isCustom = !suggestedNames.includes(value);

  const [customInput, setCustomInput] = useState(isCustom ? value : "");
  const [showCustom, setShowCustom] = useState(isCustom);

  useEffect(() => {
    if (value) loadGoogleFont(value);
  }, [value]);

  useEffect(() => {
    const newArchetype = getArchetype(mood);
    const newNames = newArchetype.suggestedFonts.map((f) => f.name);
    if (!newNames.includes(value) && !showCustom) {
      onChange(newArchetype.defaultFont);
    }
  }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSuggestedSelect(name: string) {
    setShowCustom(false);
    onChange(name);
  }

  function handleCustomToggle() {
    setShowCustom(true);
    if (customInput) {
      onChange(customInput);
    }
  }

  function handleCustomInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setCustomInput(v);
    if (v.trim()) {
      onChange(v.trim());
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Choose your font
      </h2>
      <p className="text-neutral-500 mb-8">
        Select from fonts suited to your archetype, or enter any Google Fonts family.
      </p>

      {/* Font selector */}
      <div className="flex flex-col gap-2 mb-8">
        {suggestedFonts.map((font) => {
          const isSelected = !showCustom && value === font.name;
          return (
            <label
              key={font.name}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
                isSelected
                  ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                  : "border-neutral-200 bg-white hover:border-neutral-400",
              ].join(" ")}
            >
              <input
                type="radio"
                name="font"
                value={font.name}
                checked={isSelected}
                onChange={() => handleSuggestedSelect(font.name)}
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

        {/* Custom option */}
        <label
          className={[
            "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
            showCustom
              ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
              : "border-neutral-200 bg-white hover:border-neutral-400",
          ].join(" ")}
        >
          <input
            type="radio"
            name="font"
            value="custom"
            checked={showCustom}
            onChange={handleCustomToggle}
            className="accent-neutral-900"
          />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900">Custom</span>
            {showCustom && (
              <input
                type="text"
                value={customInput}
                onChange={handleCustomInputChange}
                placeholder="e.g. Lato, Raleway, Nunito…"
                className="flex-1 text-sm px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:border-neutral-600"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </label>
      </div>

      {/* Typography preview */}
      {system && <TypeScale system={system} />}
    </div>
  );
}
