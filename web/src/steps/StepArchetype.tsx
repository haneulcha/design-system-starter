import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import type { MoodArchetype } from "../hooks/useGenerator";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { DSBadge } from "../components/DSBadge";
import { DSDivider } from "../components/DSDivider";
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

      {/* Component preview — mirrors ResultPage component section */}
      {tokens && system && (() => {
        const fontFamily = buildFontFamily(system);
        const textPrimary = resolveColor(tokens, "text/primary");
        const textMuted = resolveColor(tokens, "text/muted");
        const borderDefault = resolveColor(tokens, "border/default");
        const sectionClass = "mb-6";
        const labelClass = "text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3";

        return (
          <div className="border border-neutral-200 rounded-xl p-6 bg-neutral-50" style={{ fontFamily }}>
            <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-5">
              Component Preview — {selected.label}
            </div>

            {/* Buttons */}
            <div className={sectionClass}>
              <div className={labelClass}>Buttons</div>
              <div className="flex flex-wrap gap-3 items-center">
                <DSButton variant="primary" tokens={tokens} system={system}>Primary</DSButton>
                <DSButton variant="secondary" tokens={tokens} system={system}>Secondary</DSButton>
                <DSButton variant="ghost" tokens={tokens} system={system}>Ghost</DSButton>
                <DSButton variant="primary" disabled tokens={tokens} system={system}>Disabled</DSButton>
              </div>
            </div>

            {/* Inputs */}
            <div className={sectionClass}>
              <div className={labelClass}>Inputs</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Default</div>
                  <DSInput tokens={tokens} system={system} value="Input value" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Focus</div>
                  <DSInput state="focus" tokens={tokens} system={system} value="Focused input" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: resolveColor(tokens, "status/error"), marginBottom: 4, fontFamily }}>Error</div>
                  <DSInput state="error" tokens={tokens} system={system} value="Invalid value" />
                  <div style={{ fontSize: 11, color: resolveColor(tokens, "status/error"), marginTop: 4, fontFamily }}>
                    This field has an error
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Disabled</div>
                  <DSInput state="disabled" tokens={tokens} system={system} value="Disabled input" />
                </div>
              </div>
            </div>

            {/* Card */}
            <div className={sectionClass}>
              <div className={labelClass}>Card</div>
              <div className="grid grid-cols-2 gap-4">
                <DSCard tokens={tokens} system={system}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: textPrimary, marginBottom: 8, fontFamily }}>
                    Card Title
                  </div>
                  <div style={{ fontSize: 14, color: textMuted, lineHeight: 1.6, fontFamily }}>
                    This is a sample card component showing how content sits within the design system's card container.
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderDefault}`, display: "flex", gap: 8 }}>
                    <DSButton variant="primary" tokens={tokens} system={system}>Action</DSButton>
                    <DSButton variant="ghost" tokens={tokens} system={system}>Cancel</DSButton>
                  </div>
                </DSCard>
                <DSCard
                  image={{ src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=320&fit=crop", alt: "Abstract gradient" }}
                  tokens={tokens}
                  system={system}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, color: textPrimary, marginBottom: 8, fontFamily }}>
                    Image Card
                  </div>
                  <div style={{ fontSize: 14, color: textMuted, lineHeight: 1.6, fontFamily }}>
                    Card with an optional cover image above the content body.
                  </div>
                </DSCard>
              </div>
            </div>

            {/* Badges */}
            <div className={sectionClass}>
              <div className={labelClass}>Badges</div>
              <div className="flex flex-wrap gap-2">
                <DSBadge variant="default" tokens={tokens} system={system}>Default</DSBadge>
                <DSBadge variant="success" tokens={tokens} system={system}>Success</DSBadge>
                <DSBadge variant="error" tokens={tokens} system={system}>Error</DSBadge>
                <DSBadge variant="warning" tokens={tokens} system={system}>Warning</DSBadge>
                <DSBadge variant="info" tokens={tokens} system={system}>Info</DSBadge>
              </div>
            </div>

            {/* Divider */}
            <div className={sectionClass}>
              <div className={labelClass}>Divider</div>
              <DSDivider label="Section label" tokens={tokens} system={system} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
