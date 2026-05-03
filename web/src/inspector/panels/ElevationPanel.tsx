import type { WizardState } from "../../hooks/useGenerator";
import type {
  ElevationStyle,
  ElevationIntensity,
} from "@core/schema/elevation.js";
import {
  ELEVATION_STYLE_OPTIONS,
  ELEVATION_INTENSITY_OPTIONS,
  INTENSITY_OPACITIES,
  DEFAULT_ELEVATION_KNOBS,
} from "@core/schema/elevation.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

const STYLE_HINT: Record<ElevationStyle, string> = {
  shadow: "drops",
  ring: "borders",
  flat: "overlay only",
};

export function ElevationPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const presetKnobs = PRESETS[state.preset].elevationKnobs;
  const overrideKnobs = state.elevationKnobs;

  const presetStyle = presetKnobs?.style;
  const presetIntensity = presetKnobs?.intensity;
  const overriddenStyle = overrideKnobs?.style;
  const overriddenIntensity = overrideKnobs?.intensity;

  const effectiveStyle: ElevationStyle =
    overriddenStyle ?? presetStyle ?? DEFAULT_ELEVATION_KNOBS.style;
  const effectiveIntensity: ElevationIntensity =
    overriddenIntensity ?? presetIntensity ?? DEFAULT_ELEVATION_KNOBS.intensity;

  const styleOverridden = overriddenStyle !== undefined;
  const intensityOverridden = overriddenIntensity !== undefined;
  const anyOverridden = styleOverridden || intensityOverridden;
  const intensityActive = effectiveStyle === "shadow";

  function selectStyle(style: ElevationStyle) {
    onChange({ elevationKnobs: { ...overrideKnobs, style } });
  }

  function selectIntensity(intensity: ElevationIntensity) {
    onChange({ elevationKnobs: { ...overrideKnobs, intensity } });
  }

  function resetCategory() {
    onChange({ elevationKnobs: undefined });
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
          Elevation
          {anyOverridden && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
        </div>
        <div className="text-2xs text-neutral-500">Depth & lift</div>
      </div>

      <div className="space-y-1.5">
        <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
          Style
          {styleOverridden && (
            <span
              className="w-1 h-1 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
        </div>
        {ELEVATION_STYLE_OPTIONS.map((style) => (
          <KnobRow
            key={style}
            selected={effectiveStyle === style}
            isPreset={presetStyle === style}
            isDefault={
              presetStyle == null && DEFAULT_ELEVATION_KNOBS.style === style
            }
            onClick={() => selectStyle(style)}
            label={style}
            tokens={<span className="text-neutral-400">{STYLE_HINT[style]}</span>}
          />
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
          Intensity
          {intensityOverridden && (
            <span
              className="w-1 h-1 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
          {!intensityActive && (
            <span className="text-2xs text-neutral-300 normal-case tracking-normal">
              (shadow only)
            </span>
          )}
        </div>
        {ELEVATION_INTENSITY_OPTIONS.map((intensity) => (
          <KnobRow
            key={intensity}
            selected={effectiveIntensity === intensity}
            isPreset={presetIntensity === intensity}
            isDefault={
              presetIntensity == null &&
              DEFAULT_ELEVATION_KNOBS.intensity === intensity
            }
            onClick={() => selectIntensity(intensity)}
            label={intensity}
            tokens={
              <span>
                <span className="text-neutral-400">overlay α</span>{" "}
                {INTENSITY_OPACITIES[intensity].overlay.toFixed(2)}
              </span>
            }
          />
        ))}
      </div>

      {anyOverridden && (
        <div className="pt-2">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
