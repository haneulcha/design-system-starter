import type { WizardState } from "../../hooks/useGenerator";
import type { HeadingStyle } from "@core/schema/typography.js";
import {
  HEADING_STYLE_OPTIONS,
  DEFAULT_TYPOGRAPHY_KNOBS,
} from "@core/schema/typography.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

const HEADING_WEIGHTS: Record<HeadingStyle, string> = {
  default: "500 / 600",
  flat: "400",
  bold: "700",
};

export function TypographyPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const presetStyle = PRESETS[state.preset].typographyKnobs?.headingStyle;
  const overriddenStyle = state.typographyKnobs?.headingStyle;
  const effective: HeadingStyle =
    overriddenStyle ?? presetStyle ?? DEFAULT_TYPOGRAPHY_KNOBS.headingStyle;
  const isOverridden = overriddenStyle !== undefined;

  function selectStyle(headingStyle: HeadingStyle) {
    onChange({
      typographyKnobs: { ...state.typographyKnobs, headingStyle },
    });
  }

  function resetCategory() {
    onChange({ typographyKnobs: undefined });
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
          Typography
          {isOverridden && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
        </div>
        <div className="text-2xs text-neutral-500">Heading weight ramp</div>
      </div>

      <div className="space-y-1.5">
        <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1">
          Heading style
        </div>
        {HEADING_STYLE_OPTIONS.map((style) => (
          <KnobRow
            key={style}
            selected={effective === style}
            isPreset={presetStyle === style}
            isDefault={
              presetStyle == null &&
              DEFAULT_TYPOGRAPHY_KNOBS.headingStyle === style
            }
            onClick={() => selectStyle(style)}
            label={style}
            tokens={
              <span>
                <span className="text-neutral-400">wt</span>{" "}
                {HEADING_WEIGHTS[style]}
              </span>
            }
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
