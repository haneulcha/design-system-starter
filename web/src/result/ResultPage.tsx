import { useEffect, useState } from "react";
import type { WizardState, FullResult, PresetName } from "../hooks/useGenerator";
import { ARCHETYPES } from "@core/schema/archetypes.js";
import { ColorPalette } from "../components/ColorPalette";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { DSBadge } from "../components/DSBadge";
import { DSDivider } from "../components/DSDivider";
import { TypeScale } from "../components/TypeScale";
import { DownloadPanel } from "./DownloadPanel";
import { Inspector } from "../inspector/Inspector";
import { loadGoogleFont, resolveColor, buildFontFamily } from "../lib/tokens";

const SUGGESTED_FONTS: Record<PresetName, string[]> = {
  "clean-minimal":    ["Inter", "Geist", "Manrope"],
  "warm-friendly":    ["Inter", "DM Sans", "Plus Jakarta Sans"],
  "bold-energetic":   ["Inter", "Space Grotesk", "Sora"],
  "professional":     ["Inter", "IBM Plex Sans", "Source Sans 3"],
  "playful-creative": ["Inter", "Outfit", "Quicksand"],
};

export function ResultPage({
  state,
  result,
  onChange,
  onBack,
}: {
  state: WizardState;
  result: FullResult | null;
  onChange: (p: Partial<WizardState>) => void;
  onBack: () => void;
}) {
  const suggestedNames = SUGGESTED_FONTS[state.preset];
  const isCustom = !suggestedNames.includes(state.fontFamily);
  const [customFontInput, setCustomFontInput] = useState(isCustom ? state.fontFamily : "");
  const [showCustomFont, setShowCustomFont] = useState(isCustom);

  useEffect(() => {
    if (state.fontFamily) loadGoogleFont(state.fontFamily);
  }, [state.fontFamily]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Generating your design system…</div>
      </div>
    );
  }

  const archetypeEntries = Object.values(ARCHETYPES);
  const { system, tokens } = result;
  const sectionClass = "mb-8";
  const labelClass = "text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3";
  const textPrimary = resolveColor(tokens, "text/ink");
  const textMuted = resolveColor(tokens, "text/muted");
  const fontFamily = buildFontFamily(system);
  const borderDefault = resolveColor(tokens, "bg/hairline");

  return (
    <div className="min-h-screen bg-white antialiased flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-neutral-200 lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto">
        <div className="p-5 space-y-6">
          <button
            onClick={onBack}
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to wizard
          </button>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Brand Name
            </label>
            <input
              type="text"
              value={state.brandName}
              onChange={(e) => onChange({ brandName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors"
              placeholder="Untitled"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Archetype
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {archetypeEntries.map((a) => (
                <label
                  key={a.preset}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm",
                    state.preset === a.preset
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="result-preset"
                    value={a.preset}
                    checked={state.preset === a.preset}
                    onChange={() => onChange({ preset: a.preset as PresetName })}
                    className="sr-only"
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Font Family
            </label>
            <select
              value={showCustomFont ? "custom" : state.fontFamily}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setShowCustomFont(true);
                  if (customFontInput) onChange({ fontFamily: customFontInput });
                } else {
                  setShowCustomFont(false);
                  onChange({ fontFamily: val });
                }
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500 bg-white appearance-none"
            >
              {suggestedNames.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {showCustomFont && (
              <input
                type="text"
                value={customFontInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomFontInput(v);
                  if (v.trim()) onChange({ fontFamily: v.trim() });
                }}
                className="mt-2 w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500"
                placeholder="e.g. Lato, Raleway, Nunito…"
                autoFocus
              />
            )}
          </div>

          <DownloadPanel result={result} />
        </div>
      </aside>

      {/* Main preview area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-12">
          {/* Header */}
          <div>
            <h1
              className="text-3xl font-semibold text-neutral-900 mb-1"
              style={{ fontFamily: `'${state.fontFamily}', system-ui, sans-serif` }}
            >
              {state.brandName || "Untitled"} Design System
            </h1>
            <p className="text-neutral-500 text-sm capitalize">
              {state.preset} archetype — {state.fontFamily}
            </p>
          </div>

          {/* Palette */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Color Palette</h2>
            <ColorPalette
              palette={system.colorTokens.palette}
              baseScale={system.colorTokens.baseScale}
              preset={system.colorTokens.preset}
            />
          </section>

          {/* Components */}
          <section style={{ fontFamily }}>
            <h2 className="text-lg font-semibold text-neutral-900 mb-6">Components</h2>

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
                  <div style={{ fontSize: 11, color: resolveColor(tokens, "status/error-text"), marginBottom: 4, fontFamily }}>Error</div>
                  <DSInput state="error" tokens={tokens} system={system} value="Invalid value" />
                  <div style={{ fontSize: 11, color: resolveColor(tokens, "status/error-text"), marginTop: 4, fontFamily }}>
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
              <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 720 }}>
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
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Typography</h2>
            <TypeScale system={system} />
          </section>
        </div>
      </main>
      <Inspector state={state} onChange={onChange} />
    </div>
  );
}
