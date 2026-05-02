import type { WizardState } from "../../hooks/useGenerator";
import type {
  NeutralTint,
  SemanticDepth,
  AccentSecondary,
  PartialColorKnobs,
} from "@core/schema/color.js";
import {
  NEUTRAL_TINT_OPTIONS,
  SEMANTIC_DEPTH_OPTIONS,
  ACCENT_SECONDARY_OPTIONS,
  DEFAULT_COLOR_KNOBS,
} from "@core/schema/color.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

function mergeKnob(
  base: PartialColorKnobs | undefined,
  patch: PartialColorKnobs,
): PartialColorKnobs | undefined {
  const merged: PartialColorKnobs = {
    neutral:   { ...base?.neutral,   ...patch.neutral },
    accent:    { ...base?.accent,    ...patch.accent },
    semantic:  { ...base?.semantic,  ...patch.semantic },
    aliases:   { ...base?.aliases,   ...patch.aliases },
  };
  const clean: PartialColorKnobs = {};
  if (Object.keys(merged.neutral ?? {}).length)  clean.neutral  = merged.neutral;
  if (Object.keys(merged.accent ?? {}).length)   clean.accent   = merged.accent;
  if (Object.keys(merged.semantic ?? {}).length) clean.semantic = merged.semantic;
  if (Object.keys(merged.aliases ?? {}).length)  clean.aliases  = merged.aliases;
  return Object.keys(clean).length ? clean : undefined;
}

function stripAccentSecondary(base: PartialColorKnobs | undefined): PartialColorKnobs | undefined {
  if (!base?.accent) return base;
  const { secondary: _omit, ...restAccent } = base.accent;
  void _omit;
  const cleanedAccent = Object.keys(restAccent).length ? restAccent : undefined;
  const next: PartialColorKnobs = { ...base, accent: cleanedAccent };
  if (next.accent === undefined) delete next.accent;
  return Object.keys(next).length ? next : undefined;
}

const TINT_HUE: Record<NeutralTint, number> = {
  achromatic: 0,
  cool: 250,
  green: 150,
  purple: 290,
};
const TINTED_CHROMA = 0.012;

function tintSwatchCss(tint: NeutralTint): string {
  const c = tint === "achromatic" ? 0 : TINTED_CHROMA;
  return `oklch(0.62 ${c} ${TINT_HUE[tint]})`;
}

function TintTokens({ tint }: { tint: NeutralTint }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block rounded-sm border border-neutral-200"
        style={{ width: 14, height: 14, background: tintSwatchCss(tint) }}
      />
      <span><span className="text-neutral-400">hue</span> {tint === "achromatic" ? "—" : TINT_HUE[tint]}</span>
    </span>
  );
}

function DepthTokens({ depth }: { depth: SemanticDepth }) {
  const meta: Record<SemanticDepth, string> = {
    minimal:  "bg · 3 roles",
    standard: "bg + text · 4 roles",
    rich:     "bg + text + border · 4 roles",
  };
  return <span>{meta[depth]}</span>;
}

function SecondaryTokens({ value }: { value: AccentSecondary }) {
  return (
    <span>
      <span className="text-neutral-400">accent</span> {value === "off" ? "1" : "2"}
    </span>
  );
}

export function ColorPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const presetKnobs = PRESETS[state.preset].colorKnobs;
  const overridden = state.colorKnobs;

  // Effective resolution per knob: override → preset → default.
  const presetTint = presetKnobs?.neutral?.tint;
  const overTint = overridden?.neutral?.tint;
  const effectiveTint: NeutralTint = overTint ?? presetTint ?? DEFAULT_COLOR_KNOBS.neutral.tint;

  const presetDepth = presetKnobs?.semantic?.depth;
  const overDepth = overridden?.semantic?.depth;
  const effectiveDepth: SemanticDepth = overDepth ?? presetDepth ?? DEFAULT_COLOR_KNOBS.semantic.depth;

  const presetSecondary = presetKnobs?.accent?.secondary;
  const overSecondary = overridden?.accent?.secondary;
  const effectiveSecondary: AccentSecondary = overSecondary ?? presetSecondary ?? DEFAULT_COLOR_KNOBS.accent.secondary;

  const isOverridden =
    overTint !== undefined ||
    overDepth !== undefined ||
    overSecondary !== undefined ||
    state.brandColorSecondary !== undefined;

  function patchKnob(patch: PartialColorKnobs) {
    onChange({ colorKnobs: mergeKnob(overridden, patch) });
  }

  function selectTint(tint: NeutralTint) {
    patchKnob({ neutral: { tint } });
  }
  function selectDepth(depth: SemanticDepth) {
    patchKnob({ semantic: { depth } });
  }
  function selectSecondary(value: AccentSecondary) {
    if (value === "off") {
      onChange({ brandColorSecondary: undefined, colorKnobs: stripAccentSecondary(overridden) });
    } else {
      // Generator requires brandColorSecondary when secondary='on'. Seed a
      // contrasting default if not already set, so the generator doesn't throw.
      const merged = mergeKnob(overridden, { accent: { secondary: value } });
      onChange({
        colorKnobs: merged,
        brandColorSecondary: state.brandColorSecondary ?? "#10b981",
      });
    }
  }
  function setSecondaryColor(hex: string) {
    onChange({ brandColorSecondary: hex });
  }

  function resetCategory() {
    onChange({ colorKnobs: undefined, brandColorSecondary: undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
            Color
            {isOverridden && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" title="Overridden" />}
          </div>
          <div className="text-[11px] text-neutral-500">Neutral tint, status depth, second accent</div>
        </div>
      </div>

      {/* Neutral tint */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">Neutral tint</div>
        {NEUTRAL_TINT_OPTIONS.map((tint) => (
          <KnobRow
            key={tint}
            selected={effectiveTint === tint}
            isPreset={presetTint === tint}
            isDefault={presetTint == null && DEFAULT_COLOR_KNOBS.neutral.tint === tint}
            onClick={() => selectTint(tint)}
            label={tint}
            tokens={<TintTokens tint={tint} />}
          />
        ))}
      </div>

      {/* Semantic depth */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">Status depth</div>
        {SEMANTIC_DEPTH_OPTIONS.map((depth) => (
          <KnobRow
            key={depth}
            selected={effectiveDepth === depth}
            isPreset={presetDepth === depth}
            isDefault={presetDepth == null && DEFAULT_COLOR_KNOBS.semantic.depth === depth}
            onClick={() => selectDepth(depth)}
            label={depth}
            tokens={<DepthTokens depth={depth} />}
          />
        ))}
      </div>

      {/* Accent secondary */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">Second accent</div>
        {ACCENT_SECONDARY_OPTIONS.map((value) => (
          <KnobRow
            key={value}
            selected={effectiveSecondary === value}
            isPreset={presetSecondary === value}
            isDefault={presetSecondary == null && DEFAULT_COLOR_KNOBS.accent.secondary === value}
            onClick={() => selectSecondary(value)}
            label={value}
            tokens={<SecondaryTokens value={value} />}
          />
        ))}
        {effectiveSecondary === "on" && (
          <div className="flex items-center gap-2 pl-3 pt-1.5">
            <input
              type="color"
              value={state.brandColorSecondary ?? "#10b981"}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-neutral-200 p-0.5 bg-white"
            />
            <input
              type="text"
              value={state.brandColorSecondary ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v) || v.length <= 7) setSecondaryColor(v);
              }}
              placeholder="#10b981"
              className="flex-1 font-mono text-[11px] px-2 py-1 border border-neutral-200 rounded focus:outline-none focus:border-neutral-500"
            />
          </div>
        )}
      </div>

      {isOverridden && (
        <div className="pt-1">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
