import type {
  NeutralStop,
  PaletteSlot,
  ResolvedPalette,
  SurfaceSlot,
  TextSlot,
} from "@core/schema/archetype-palettes.js";
import {
  ARCHETYPE_PALETTES,
  NEUTRAL_STOPS,
  SURFACE_SLOTS,
  TEXT_SLOTS,
  ACCENT_SLOTS,
  STATUS_SLOTS,
} from "@core/schema/archetype-palettes.js";
import type { PresetName } from "@core/schema/presets.js";

function BaseScaleRow({
  baseScale,
  baselineScale,
}: {
  baseScale: Record<NeutralStop, string>;
  baselineScale: Record<NeutralStop, string>;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
        Base scale
      </div>
      <div className="flex gap-0.5">
        {NEUTRAL_STOPS.map((stop) => {
          const hex = baseScale[stop];
          const overridden = baselineScale[stop] !== hex;
          return (
            <div key={stop} className="flex-1 relative group">
              <div
                className="h-12 first:rounded-l last:rounded-r border border-neutral-200"
                style={{ background: hex }}
              />
              <div className="text-[9px] text-center font-mono text-neutral-400 mt-1">
                {stop}
                {overridden && <span className="text-neutral-700"> ●</span>}
              </div>
              <div className="absolute top-0 left-0 right-0 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-white text-center">
                  {hex}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RefSlotGroup<S extends SurfaceSlot | TextSlot>({
  label,
  slots,
  refs,
  palette,
  baselinePalette,
}: {
  label: string;
  slots: readonly S[];
  refs: Record<S, NeutralStop>;
  palette: ResolvedPalette;
  baselinePalette: ResolvedPalette;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
        {label}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const hex = palette[slot as PaletteSlot];
          const stop = refs[slot];
          const overridden = baselinePalette[slot as PaletteSlot] !== hex;
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
                  {overridden && <span className="ml-1 text-[9px] text-neutral-700">●</span>}
                </div>
                <div className="font-mono text-[10px] text-neutral-500 truncate">
                  → neutral.{stop}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlatGroup({
  label,
  slots,
  palette,
  baselinePalette,
  cols = 4,
}: {
  label: string;
  slots: readonly PaletteSlot[];
  palette: ResolvedPalette;
  baselinePalette: ResolvedPalette;
  cols?: number;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
        {label}
      </div>
      <div className={`grid grid-cols-${cols} gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {slots.map((slot) => {
          const hex = palette[slot];
          const overridden = baselinePalette[slot] !== hex;
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
                  {overridden && <span className="ml-1 text-[9px] text-neutral-700">●</span>}
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
  baseScale,
  preset,
}: {
  palette: ResolvedPalette;
  baseScale: Record<NeutralStop, string>;
  preset: PresetName;
}) {
  const archetype = ARCHETYPE_PALETTES[preset];
  // Compute the baseline palette (no overrides) once for override-detection.
  const baselinePalette: ResolvedPalette = {
    ...Object.fromEntries(SURFACE_SLOTS.map((s) => [s, archetype.baseScale[archetype.surfaceRefs[s]]])),
    ...Object.fromEntries(TEXT_SLOTS.map((s) => [s, archetype.baseScale[archetype.textRefs[s]]])),
    accent: archetype.accent,
    ...archetype.status,
  } as ResolvedPalette;

  return (
    <div className="space-y-5">
      <BaseScaleRow baseScale={baseScale} baselineScale={archetype.baseScale} />
      <RefSlotGroup label="Surface" slots={SURFACE_SLOTS} refs={archetype.surfaceRefs} palette={palette} baselinePalette={baselinePalette} />
      <RefSlotGroup label="Text"    slots={TEXT_SLOTS}    refs={archetype.textRefs}    palette={palette} baselinePalette={baselinePalette} />
      <FlatGroup    label="Accent"  slots={ACCENT_SLOTS}  palette={palette} baselinePalette={baselinePalette} cols={4} />
      <FlatGroup    label="Status"  slots={STATUS_SLOTS}  palette={palette} baselinePalette={baselinePalette} cols={4} />
    </div>
  );
}
