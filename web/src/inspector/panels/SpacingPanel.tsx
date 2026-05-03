import type { WizardState } from "../../hooks/useGenerator";
import type { DensityMode, SpacingAliasName } from "@core/schema/spacing.js";
import {
  BASE_ALIASES,
  DENSITY_OPTIONS,
  DENSITY_TO_SECTION_PX,
  DEFAULT_SPACING_KNOBS,
} from "@core/schema/spacing.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

const ALIAS_ORDER: SpacingAliasName[] = [
  "xxs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "xxl",
  "section",
];

const MAX_BAR_PX = 96;

function AliasBar({ name, value, max }: { name: string; value: number; max: number }) {
  const widthPct = Math.max(4, (value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-2xs">
      <span className="w-12 text-neutral-500 tabular-nums">{name}</span>
      <div className="flex-1 h-1.5 bg-neutral-100 rounded-sm overflow-hidden">
        <div
          className="h-full bg-neutral-700 rounded-sm transition-[width]"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="w-7 text-neutral-400 font-mono tabular-nums text-right">{value}</span>
    </div>
  );
}

export function SpacingPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const presetDensity = PRESETS[state.preset].spacingKnobs?.density;
  const overriddenDensity = state.spacingKnobs?.density;
  const effective: DensityMode =
    overriddenDensity ?? presetDensity ?? DEFAULT_SPACING_KNOBS.density;
  const isOverridden = overriddenDensity !== undefined;

  const aliases: Record<SpacingAliasName, number> = {
    ...BASE_ALIASES,
    section: DENSITY_TO_SECTION_PX[effective],
  };

  function selectDensity(density: DensityMode) {
    onChange({ spacingKnobs: { ...state.spacingKnobs, density } });
  }

  function resetCategory() {
    onChange({ spacingKnobs: undefined });
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
          Spacing
          {isOverridden && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
        </div>
        <div className="text-2xs text-neutral-500">Section rhythm</div>
      </div>

      <div className="space-y-1.5">
        <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1">
          Density
        </div>
        {DENSITY_OPTIONS.map((density) => (
          <KnobRow
            key={density}
            selected={effective === density}
            isPreset={presetDensity === density}
            isDefault={
              presetDensity == null &&
              DEFAULT_SPACING_KNOBS.density === density
            }
            onClick={() => selectDensity(density)}
            label={density}
            tokens={
              <span>
                <span className="text-neutral-400">section</span>{" "}
                {DENSITY_TO_SECTION_PX[density]}
              </span>
            }
          />
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1">
          Scale preview
        </div>
        <div className="px-3 py-2.5 border border-neutral-200 rounded-md space-y-1">
          {ALIAS_ORDER.map((alias) => (
            <AliasBar
              key={alias}
              name={alias}
              value={aliases[alias]}
              max={MAX_BAR_PX}
            />
          ))}
        </div>
      </div>

      {isOverridden && (
        <div className="pt-2">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
