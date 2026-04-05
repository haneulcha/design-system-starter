import { useMemo } from "react";
import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import { generateScales } from "@core/generator/color.js";
import type { MoodArchetype } from "../hooks/useGenerator";

const REFERENCES: Record<MoodArchetype, string> = {
  precise: "Stripe, IBM, X.ai",
  confident: "Vercel, Notion, Airbnb",
  expressive: "Linear, Apple, Claude",
  modern: "Supabase, Resend, Coinbase",
};

const shadowMap: Record<string, string> = {
  whisper: "0 1px 2px rgba(0,0,0,0.04)",
  subtle: "0 1px 3px rgba(0,0,0,0.08)",
  medium: "0 4px 12px rgba(0,0,0,0.12)",
  dramatic: "0 8px 24px rgba(0,0,0,0.2)",
};

const ARCHETYPE_KEYS: MoodArchetype[] = ["precise", "confident", "expressive", "modern"];

export function StepArchetype({
  value,
  primaryColor,
  onChange,
}: {
  value: MoodArchetype;
  primaryColor: string;
  onChange: (v: MoodArchetype) => void;
}) {
  const selected = getArchetype(value);

  const brandColor = useMemo(() => {
    try {
      const scales = generateScales(primaryColor, selected.neutralUndertone);
      // Find the brand scale key (not gray, red, amber, green, blue unless it's the brand)
      const statusNames = new Set(["gray", "red", "amber", "green"]);
      const brandKey = Object.keys(scales).find((k) => !statusNames.has(k)) ?? "blue";
      return scales[brandKey]?.["700"]?.light ?? primaryColor;
    } catch {
      return primaryColor;
    }
  }, [primaryColor, selected.neutralUndertone]);

  const shadow = shadowMap[selected.shadowIntensity] ?? shadowMap.subtle;

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Choose your archetype
      </h2>
      <p className="text-neutral-500 mb-8">
        Each archetype defines a visual personality — radius, weight, shadow, and spacing.
      </p>

      {/* 2×2 grid of archetype cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {ARCHETYPE_KEYS.map((key) => {
          const arch = ARCHETYPES[key];
          const isSelected = key === value;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={[
                "text-left p-4 rounded-lg border transition-all",
                isSelected
                  ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                  : "border-neutral-200 bg-white hover:border-neutral-400",
              ].join(" ")}
            >
              {/* Mini button preview */}
              <div className="mb-3">
                <span
                  className="inline-block px-3 py-1 text-xs font-medium text-white"
                  style={{
                    borderRadius: arch.buttonRadius,
                    backgroundColor: isSelected ? brandColor : "#6b7280",
                  }}
                >
                  Button
                </span>
              </div>

              <div className="font-semibold text-sm text-neutral-900 mb-1">
                {arch.label}
              </div>
              <div className="text-xs text-neutral-500 mb-2 leading-snug">
                {arch.description}
              </div>
              <div className="text-[11px] text-neutral-400">
                {REFERENCES[key]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Component preview */}
      <div className="border border-neutral-200 rounded-xl p-6 bg-neutral-50">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
          Component Preview — {selected.label}
        </div>

        {/* Buttons row */}
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Primary filled */}
          <button
            className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{
              borderRadius: selected.buttonRadius,
              backgroundColor: brandColor,
              boxShadow: shadow,
            }}
          >
            Primary
          </button>

          {/* Secondary light */}
          <button
            className="px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              borderRadius: selected.buttonRadius,
              backgroundColor: brandColor + "18",
              color: brandColor,
              boxShadow: shadow,
            }}
          >
            Secondary
          </button>

          {/* Ghost outlined */}
          <button
            className="px-4 py-2 text-sm font-medium bg-transparent transition-opacity hover:opacity-80"
            style={{
              borderRadius: selected.buttonRadius,
              border: `1.5px solid ${brandColor}`,
              color: brandColor,
            }}
          >
            Ghost
          </button>
        </div>

        {/* Mini card */}
        <div
          className="p-4 bg-white mb-4 inline-block w-full"
          style={{
            borderRadius: selected.cardRadius,
            boxShadow: shadow,
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="text-sm font-medium text-neutral-800 mb-1">Card Component</div>
          <div className="text-xs text-neutral-400">
            radius: {selected.cardRadius} · shadow: {selected.shadowIntensity}
          </div>
        </div>

        {/* Mini input */}
        <div>
          <input
            readOnly
            value="Input field"
            className="w-full px-3 py-2 text-sm border border-neutral-300 bg-white text-neutral-700 outline-none"
            style={{
              borderRadius: selected.inputRadius,
            }}
          />
          <div className="text-[11px] text-neutral-400 mt-1">
            input radius: {selected.inputRadius}
          </div>
        </div>
      </div>
    </div>
  );
}
