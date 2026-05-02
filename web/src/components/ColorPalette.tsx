import type {
  ArchetypePalette,
  PaletteSlot,
} from "@core/schema/archetype-palettes.js";
import {
  SURFACE_SLOTS,
  TEXT_SLOTS,
  ACCENT_SLOTS,
  STATUS_SLOTS,
  ARCHETYPE_PALETTES,
} from "@core/schema/archetype-palettes.js";
import type { PresetName } from "@core/schema/presets.js";

function Group({
  label,
  slots,
  palette,
  baseline,
}: {
  label: string;
  slots: readonly PaletteSlot[];
  palette: ArchetypePalette;
  baseline: ArchetypePalette;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
        {label}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const hex = palette[slot];
          const overridden = baseline[slot] !== hex;
          return (
            <div
              key={slot}
              className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 bg-white"
            >
              <div
                className="w-8 h-8 rounded shrink-0 border border-neutral-200"
                style={{ background: hex }}
                title={hex}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-neutral-900 truncate">
                  {slot}
                  {overridden && (
                    <span className="ml-1 text-[9px] text-neutral-500 uppercase tracking-wider">·edit</span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-neutral-500 truncate">{hex}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ColorPalette({
  palette,
  preset,
}: {
  palette: ArchetypePalette;
  preset: PresetName;
}) {
  const baseline = ARCHETYPE_PALETTES[preset];
  return (
    <div className="space-y-5">
      <Group label="Surface" slots={SURFACE_SLOTS} palette={palette} baseline={baseline} />
      <Group label="Text"    slots={TEXT_SLOTS}    palette={palette} baseline={baseline} />
      <Group label="Accent"  slots={ACCENT_SLOTS}  palette={palette} baseline={baseline} />
      <Group label="Status"  slots={STATUS_SLOTS}  palette={palette} baseline={baseline} />
    </div>
  );
}
