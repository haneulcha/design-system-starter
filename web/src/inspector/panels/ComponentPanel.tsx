import type { WizardState } from "../../hooks/useGenerator";
import type { CardSurface, ButtonShape } from "@core/schema/components.js";
import {
  CARD_SURFACE_OPTIONS,
  BUTTON_SHAPE_OPTIONS,
  DEFAULT_COMPONENT_KNOBS,
} from "@core/schema/components.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

const SURFACE_HINT: Record<CardSurface, string> = {
  outlined: "ring",
  elevated: "shadow",
  filled: "tint",
};

const SHAPE_HINT: Record<ButtonShape, string> = {
  rect: "radius.button",
  pill: "9999px",
};

function CardSwatch({
  surface,
  active,
}: {
  surface: CardSurface;
  active: boolean;
}) {
  const base =
    "h-10 rounded flex items-center justify-center text-2xs text-neutral-500 transition-all";
  const variantClass =
    surface === "outlined"
      ? "bg-white border border-neutral-300"
      : surface === "elevated"
        ? "bg-white shadow-md"
        : "bg-neutral-100";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={[base, variantClass].join(" ") + " w-full"} />
      <span
        className={[
          "text-2xs",
          active ? "text-neutral-900 font-medium" : "text-neutral-400",
        ].join(" ")}
      >
        {surface}
      </span>
    </div>
  );
}

function ButtonSwatch({
  shape,
  active,
}: {
  shape: ButtonShape;
  active: boolean;
}) {
  const radius = shape === "pill" ? "rounded-full" : "rounded-md";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          "h-7 px-4 bg-neutral-900 text-white text-2xs flex items-center justify-center transition-all",
          radius,
        ].join(" ")}
      >
        Button
      </div>
      <span
        className={[
          "text-2xs",
          active ? "text-neutral-900 font-medium" : "text-neutral-400",
        ].join(" ")}
      >
        {shape}
      </span>
    </div>
  );
}

export function ComponentPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const presetKnobs = PRESETS[state.preset].componentKnobs;
  const overrideKnobs = state.componentKnobs;

  const presetSurface = presetKnobs?.cardSurface;
  const presetShape = presetKnobs?.buttonShape;
  const overriddenSurface = overrideKnobs?.cardSurface;
  const overriddenShape = overrideKnobs?.buttonShape;

  const effectiveSurface: CardSurface =
    overriddenSurface ?? presetSurface ?? DEFAULT_COMPONENT_KNOBS.cardSurface;
  const effectiveShape: ButtonShape =
    overriddenShape ?? presetShape ?? DEFAULT_COMPONENT_KNOBS.buttonShape;

  const surfaceOverridden = overriddenSurface !== undefined;
  const shapeOverridden = overriddenShape !== undefined;
  const anyOverridden = surfaceOverridden || shapeOverridden;

  function selectSurface(cardSurface: CardSurface) {
    onChange({ componentKnobs: { ...overrideKnobs, cardSurface } });
  }

  function selectShape(buttonShape: ButtonShape) {
    onChange({ componentKnobs: { ...overrideKnobs, buttonShape } });
  }

  function resetCategory() {
    onChange({ componentKnobs: undefined });
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
          Component
          {anyOverridden && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
        </div>
        <div className="text-2xs text-neutral-500">Primitive treatment</div>
      </div>

      <div className="space-y-1.5">
        <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
          Card surface
          {surfaceOverridden && (
            <span
              className="w-1 h-1 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
        </div>
        {CARD_SURFACE_OPTIONS.map((surface) => (
          <KnobRow
            key={surface}
            selected={effectiveSurface === surface}
            isPreset={presetSurface === surface}
            isDefault={
              presetSurface == null &&
              DEFAULT_COMPONENT_KNOBS.cardSurface === surface
            }
            onClick={() => selectSurface(surface)}
            label={surface}
            tokens={
              <span className="text-neutral-400">{SURFACE_HINT[surface]}</span>
            }
          />
        ))}
        <div className="px-3 py-2.5 grid grid-cols-3 gap-2 border border-neutral-200 rounded-md">
          {CARD_SURFACE_OPTIONS.map((surface) => (
            <CardSwatch
              key={surface}
              surface={surface}
              active={effectiveSurface === surface}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
          Button shape
          {shapeOverridden && (
            <span
              className="w-1 h-1 rounded-full bg-neutral-900"
              title="Overridden"
            />
          )}
        </div>
        {BUTTON_SHAPE_OPTIONS.map((shape) => (
          <KnobRow
            key={shape}
            selected={effectiveShape === shape}
            isPreset={presetShape === shape}
            isDefault={
              presetShape == null &&
              DEFAULT_COMPONENT_KNOBS.buttonShape === shape
            }
            onClick={() => selectShape(shape)}
            label={shape}
            tokens={<span>{SHAPE_HINT[shape]}</span>}
          />
        ))}
        <div className="px-3 py-2.5 flex justify-around gap-2 border border-neutral-200 rounded-md">
          {BUTTON_SHAPE_OPTIONS.map((shape) => (
            <ButtonSwatch
              key={shape}
              shape={shape}
              active={effectiveShape === shape}
            />
          ))}
        </div>
      </div>

      {anyOverridden && (
        <div className="pt-2">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
