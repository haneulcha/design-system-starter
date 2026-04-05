import { useEffect, useState } from "react";
import type { WizardState, MoodArchetype } from "../hooks/useGenerator";
import { useGenerateResult, ARCHETYPES, getArchetype } from "../hooks/useGenerator";
import { ColorPreview } from "./ColorPreview";
import { ComponentPreview } from "./ComponentPreview";
import { TypePreview } from "./TypePreview";
import { DownloadPanel } from "./DownloadPanel";

function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function ResultPage({
  state,
  onChange,
  onBack,
}: {
  state: WizardState;
  onChange: (p: Partial<WizardState>) => void;
  onBack: () => void;
}) {
  const result = useGenerateResult(state);
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

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 md:h-screen md:sticky md:top-0 md:overflow-y-auto">
        <div className="p-5 space-y-6">
          {/* Back button */}
          <button
            onClick={onBack}
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to wizard
          </button>

          {/* Brand name */}
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

          {/* Color */}
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

          {/* Archetype */}
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

          {/* Font */}
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

          {/* Download panel */}
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

          {/* Color preview */}
          <section>
            <ColorPreview scales={result.system.colors} />
          </section>

          {/* Component preview */}
          <section>
            <ComponentPreview system={result.system} tokens={result.tokens} />
          </section>

          {/* Type preview */}
          <section>
            <TypePreview system={result.system} />
          </section>
        </div>
      </main>
    </div>
  );
}
