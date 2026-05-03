import type {
  NeutralStop,
  PaletteSlot,
  ResolvedPalette,
  StatusSlot,
  SurfaceSlot,
  TextSlot,
} from "@core/schema/archetype-palettes.js";
import {
  ARCHETYPE_PALETTES,
  NEUTRAL_STOPS,
  STATUS_SLOTS,
  SURFACE_SLOTS,
  TEXT_SLOTS,
} from "@core/schema/archetype-palettes.js";
import type { PresetName } from "@core/schema/presets.js";
import { ColorRow } from "./ColorRow";
import { ColorScaleStrip, type ColorScaleStop } from "./ColorScaleStrip";

// ─── Layout ────────────────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
        {label}
      </div>
      {children}
    </div>
  );
}

interface RowSpec {
  hex: string;
  title: string;
  subtitle: string;
  overridden: boolean;
}

function RowList({
  rows,
  cols = 1,
}: {
  rows: readonly RowSpec[];
  cols?: number;
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {rows.map((r) => (
        <ColorRow key={r.title} {...r} />
      ))}
    </div>
  );
}

// ─── Adapter ───────────────────────────────────────────────────────────────

function buildAdapters(
  preset: PresetName,
  palette: ResolvedPalette,
  baseScale: Record<NeutralStop, string>,
) {
  const archetype = ARCHETYPE_PALETTES[preset];

  // Baseline palette (palette with zero overrides) — used purely to detect
  // which slots have been edited away from their archetype default.
  const baselinePalette: ResolvedPalette = {
    ...Object.fromEntries(
      SURFACE_SLOTS.map((s) => [
        s,
        archetype.baseScale[archetype.surfaceRefs[s]],
      ]),
    ),
    ...Object.fromEntries(
      TEXT_SLOTS.map((s) => [s, archetype.baseScale[archetype.textRefs[s]]]),
    ),
    accent: archetype.accent,
    ...archetype.status,
  } as ResolvedPalette;

  const baseStops: ColorScaleStop[] = NEUTRAL_STOPS.map((stop) => ({
    key: stop,
    hex: baseScale[stop],
    overridden: archetype.baseScale[stop] !== baseScale[stop],
  }));

  const refRow = <S extends SurfaceSlot | TextSlot>(
    slot: S,
    refs: Record<S, NeutralStop>,
  ): RowSpec => ({
    title: slot,
    hex: palette[slot as PaletteSlot],
    subtitle: `neutral.${refs[slot]}`,
    overridden:
      baselinePalette[slot as PaletteSlot] !== palette[slot as PaletteSlot],
  });

  const flatRow = (slot: PaletteSlot): RowSpec => ({
    title: slot,
    hex: palette[slot],
    subtitle: palette[slot],
    overridden: baselinePalette[slot] !== palette[slot],
  });

  return {
    baseStops,
    surfaceRows: SURFACE_SLOTS.map((s) => refRow(s, archetype.surfaceRefs)),
    textRows: TEXT_SLOTS.map((s) => refRow(s, archetype.textRefs)),
    accentRow: flatRow("accent"),
    statusRows: STATUS_SLOTS.map((s) => flatRow(s as StatusSlot)),
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ColorPalette({
  palette,
  baseScale,
  preset,
}: {
  palette: ResolvedPalette;
  baseScale: Record<NeutralStop, string>;
  preset: PresetName;
}) {
  const { baseStops, surfaceRows, textRows, accentRow, statusRows } =
    buildAdapters(preset, palette, baseScale);

  return (
    <div className="space-y-5">
      <Section label="Base scale">
        <ColorScaleStrip stops={baseStops} />
      </Section>

      <div className="flex gap-2 justify-between">
        <Section label="Surface">
          <RowList rows={surfaceRows} />
        </Section>
        <Section label="Text">
          <RowList rows={textRows} />
        </Section>
        <Section label="Accent">
          <RowList rows={[accentRow]} />
        </Section>
        <Section label="Status">
          <RowList rows={statusRows} cols={2} />
        </Section>
      </div>
    </div>
  );
}
