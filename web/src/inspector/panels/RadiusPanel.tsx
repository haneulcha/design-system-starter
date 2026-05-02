import type { WizardState } from "../../hooks/useGenerator";
import type { RadiusStyle } from "@core/schema/radius.js";
import { RADIUS_STYLE_OPTIONS, STYLE_PROFILES, DEFAULT_RADIUS_KNOBS } from "@core/schema/radius.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

function fmt(v: number | "pill"): string {
  return v === "pill" ? "∞" : String(v);
}

function TokenTriplet({ style }: { style: RadiusStyle }) {
  const p = STYLE_PROFILES[style];
  return (
    <span className="inline-flex items-baseline gap-2">
      <span><span className="text-neutral-400">btn</span> {fmt(p.button)}</span>
      <span className="text-neutral-300">·</span>
      <span><span className="text-neutral-400">in</span> {fmt(p.input)}</span>
      <span className="text-neutral-300">·</span>
      <span><span className="text-neutral-400">card</span> {p.card}</span>
    </span>
  );
}

export function RadiusPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const presetStyle = PRESETS[state.preset].radiusKnobs?.style;
  const overriddenStyle = state.radiusKnobs?.style;
  const effective: RadiusStyle = overriddenStyle ?? presetStyle ?? DEFAULT_RADIUS_KNOBS.style;
  const isOverridden = overriddenStyle !== undefined;

  function selectStyle(style: RadiusStyle) {
    onChange({ radiusKnobs: { style } });
  }

  function resetCategory() {
    onChange({ radiusKnobs: undefined });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
            Radius
            {isOverridden && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" title="Overridden" />}
          </div>
          <div className="text-[11px] text-neutral-500">Corner geometry</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">Style</div>
        {RADIUS_STYLE_OPTIONS.map((style) => (
          <KnobRow
            key={style}
            selected={effective === style}
            isPreset={presetStyle === style}
            isDefault={presetStyle == null && DEFAULT_RADIUS_KNOBS.style === style}
            onClick={() => selectStyle(style)}
            label={style}
            tokens={<TokenTriplet style={style} />}
          />
        ))}
      </div>

      {isOverridden && (
        <div className="pt-2">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
