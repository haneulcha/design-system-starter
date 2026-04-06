import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import type { MoodArchetype } from "../hooks/useGenerator";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { resolveColor, resolveComponentColor, buildFontFamily } from "../lib/tokens";

const REFERENCES: Record<MoodArchetype, string> = {
  precise: "Stripe, IBM, X.ai",
  confident: "Vercel, Notion, Airbnb",
  expressive: "Linear, Apple, Claude",
  modern: "Supabase, Resend, Coinbase",
};

const ARCHETYPE_KEYS: MoodArchetype[] = ["precise", "confident", "expressive", "modern"];

export function StepArchetype({
  value,
  tokens,
  system,
  onChange,
}: {
  value: MoodArchetype;
  tokens: DesignTokens | null;
  system: DesignSystem | null;
  onChange: (v: MoodArchetype) => void;
}) {
  const selected = getArchetype(value);
  const brandColor = tokens ? resolveComponentColor(tokens, "button.primary.bg") : "#6b7280";

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

      {/* Component preview using atomic components */}
      {tokens && system && (
        <div className="border border-neutral-200 rounded-xl p-6 bg-neutral-50">
          <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Component Preview — {selected.label}
          </div>

          {/* Buttons row */}
          <div className="flex flex-wrap gap-3 mb-5">
            <DSButton variant="primary" tokens={tokens} system={system}>Primary</DSButton>
            <DSButton variant="secondary" tokens={tokens} system={system}>Secondary</DSButton>
            <DSButton variant="ghost" tokens={tokens} system={system}>Ghost</DSButton>
          </div>

          {/* Card */}
          <div className="mb-4">
            <DSCard tokens={tokens} system={system}>
              <div
                className="text-sm font-medium mb-1"
                style={{ color: resolveColor(tokens, "text/primary"), fontFamily: buildFontFamily(system) }}
              >
                Card Component
              </div>
              <div
                className="text-xs"
                style={{ color: resolveColor(tokens, "text/muted"), fontFamily: buildFontFamily(system) }}
              >
                radius: {selected.cardRadius} · shadow: {selected.shadowIntensity}
              </div>
            </DSCard>
          </div>

          {/* Input */}
          <div>
            <DSInput tokens={tokens} system={system} value="Input field" />
            <div className="text-[11px] text-neutral-400 mt-1">
              input radius: {selected.inputRadius}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
