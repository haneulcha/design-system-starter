import { useEffect, useState } from "react";
import type { WizardState, MoodArchetype, FullResult } from "../hooks/useGenerator";
import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import { ColorScale } from "../components/ColorScale";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { DSBadge } from "../components/DSBadge";
import { DSDivider } from "../components/DSDivider";
import { TypeScale } from "../components/TypeScale";
import { DownloadPanel } from "./DownloadPanel";
import { loadGoogleFont, resolveColor, buildFontFamily } from "../lib/tokens";

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
  const archetype = getArchetype(state.mood);
  const suggestedFonts = archetype.suggestedFonts;
  const suggestedNames = suggestedFonts.map((f) => f.name);
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
  const textPrimary = resolveColor(tokens, "text/primary");
  const textMuted = resolveColor(tokens, "text/muted");
  const fontFamily = buildFontFamily(system);
  const borderDefault = resolveColor(tokens, "border/default");

  return (
    <div className="min-h-screen bg-white antialiased flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 md:h-screen md:sticky md:top-0 md:overflow-y-auto">
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
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="w-9 h-9 rounded cursor-pointer border border-neutral-200 p-0.5 bg-white"
              />
              <input
                type="text"
                value={state.primaryColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange({ primaryColor: v });
                  else if (v.length <= 7) onChange({ primaryColor: v });
                }}
                className="flex-1 font-mono text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500"
                placeholder="#5e6ad2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Archetype
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {archetypeEntries.map((a) => (
                <label
                  key={a.mood}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm",
                    state.mood === a.mood
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="result-mood"
                    value={a.mood}
                    checked={state.mood === a.mood}
                    onChange={() => onChange({ mood: a.mood as MoodArchetype })}
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
              {suggestedFonts.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
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
              {state.mood} archetype — {state.fontFamily}
            </p>
          </div>

          {/* Color scales */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Color Scales</h2>
            <ColorScale scales={system.colors} />
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
              <div style={{ maxWidth: 360 }}>
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
    </div>
  );
}
