import type { WizardState } from "../../hooks/useGenerator";
import type { RadiusStyle } from "@core/schema/radius.js";
import { RADIUS_STYLE_OPTIONS, STYLE_PROFILES, DEFAULT_RADIUS_KNOBS } from "@core/schema/radius.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

const TOKEN_LABEL: Record<RadiusStyle, string> = {
  sharp:    "4·4·8",
  standard: "8·8·12",
  generous: "12·8·16",
  pill:     "∞·∞·12",
};

function previewRadiusPx(style: RadiusStyle, slot: "button" | "input"): number | string {
  const v = STYLE_PROFILES[style][slot];
  return v === "pill" ? 9999 : v;
}

function MiniPreview({ style }: { style: RadiusStyle }) {
  const btn = previewRadiusPx(style, "button");
  const inp = previewRadiusPx(style, "input");
  return (
    <>
      <div style={{ width: 22, height: 12, background: "#262626", borderRadius: btn }} />
      <div style={{ width: 16, height: 12, background: "#fff", border: "1px solid #d4d4d0", borderRadius: inp }} />
    </>
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
            preview={<MiniPreview style={style} />}
            label={style}
            tokens={TOKEN_LABEL[style]}
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
