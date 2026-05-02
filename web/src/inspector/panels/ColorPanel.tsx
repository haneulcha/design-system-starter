import type { WizardState } from "../../hooks/useGenerator";
import type {
  PaletteSlot,
  PaletteOverrides,
} from "@core/schema/archetype-palettes.js";
import {
  SURFACE_SLOTS,
  TEXT_SLOTS,
  ACCENT_SLOTS,
  STATUS_SLOTS,
  ARCHETYPE_PALETTES,
  resolvePalette,
} from "@core/schema/archetype-palettes.js";
import { ResetButton } from "../ResetButton";

function SlotRow({
  slot,
  effective,
  baseline,
  onChange,
}: {
  slot: PaletteSlot;
  effective: string;
  baseline: string;
  onChange: (hex: string) => void;
}) {
  const overridden = effective !== baseline;
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={effective}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded cursor-pointer border border-neutral-200 p-0.5 bg-white shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-neutral-900 font-medium flex items-center gap-1.5">
          {slot}
          {overridden && (
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" title="Override" />
          )}
        </div>
        <div className="font-mono text-[10px] text-neutral-500">{effective}</div>
      </div>
    </div>
  );
}

function Section({
  label,
  slots,
  effective,
  baseline,
  onSlotChange,
}: {
  label: string;
  slots: readonly PaletteSlot[];
  effective: Record<PaletteSlot, string>;
  baseline: Record<PaletteSlot, string>;
  onSlotChange: (slot: PaletteSlot, hex: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">{label}</div>
      <div className="space-y-1.5">
        {slots.map((slot) => (
          <SlotRow
            key={slot}
            slot={slot}
            effective={effective[slot]}
            baseline={baseline[slot]}
            onChange={(hex) => onSlotChange(slot, hex)}
          />
        ))}
      </div>
    </div>
  );
}

export function ColorPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const baseline = ARCHETYPE_PALETTES[state.preset];
  const effective = resolvePalette(state.preset, state.paletteOverrides);
  const overrideCount = Object.keys(state.paletteOverrides ?? {}).length;
  const isOverridden = overrideCount > 0;

  function setSlot(slot: PaletteSlot, hex: string) {
    const baselineHex = baseline[slot];
    const next: PaletteOverrides = { ...(state.paletteOverrides ?? {}) };
    if (hex === baselineHex) {
      delete next[slot];
    } else {
      next[slot] = hex;
    }
    onChange({ paletteOverrides: Object.keys(next).length ? next : undefined });
  }

  function resetCategory() {
    onChange({ paletteOverrides: undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
            Color
            {isOverridden && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" title="Overridden" />}
          </div>
          <div className="text-[11px] text-neutral-500">
            Palette anchored on <span className="font-medium">{state.preset}</span>
            {isOverridden && ` · ${overrideCount} slot${overrideCount > 1 ? "s" : ""} overridden`}
          </div>
        </div>
      </div>

      <Section label="Surface" slots={SURFACE_SLOTS} effective={effective} baseline={baseline} onSlotChange={setSlot} />
      <Section label="Text"    slots={TEXT_SLOTS}    effective={effective} baseline={baseline} onSlotChange={setSlot} />
      <Section label="Accent"  slots={ACCENT_SLOTS}  effective={effective} baseline={baseline} onSlotChange={setSlot} />
      <Section label="Status"  slots={STATUS_SLOTS}  effective={effective} baseline={baseline} onSlotChange={setSlot} />

      {isOverridden && (
        <div className="pt-1">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
