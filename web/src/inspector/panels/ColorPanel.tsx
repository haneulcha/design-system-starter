import type { WizardState } from "../../hooks/useGenerator";
import type {
  AccentRecommendation,
  NeutralStop,
  PaletteOverrides,
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
  resolveBaseScale,
  resolvePalette,
} from "@core/schema/archetype-palettes.js";
import { ColorRow } from "../../components/ColorRow";
import {
  ColorScaleStrip,
  type ColorScaleStop,
} from "../../components/ColorScaleStrip";
import { ResetButton } from "../ResetButton";

// ─── Layout ────────────────────────────────────────────────────────────────

function Section({
  label,
  overridden,
  children,
}: {
  label: string;
  overridden?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-2xs text-neutral-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
        {label}
        {overridden && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-neutral-900"
            title="Override"
          />
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

// ─── Adapter ───────────────────────────────────────────────────────────────

function buildAdapters(state: WizardState): {
  baseStops: ColorScaleStop[];
  surfaceRows: {
    hex: string;
    title: string;
    subtitle: string;
    overridden: boolean;
  }[];
  textRows: {
    hex: string;
    title: string;
    subtitle: string;
    overridden: boolean;
  }[];
  accent: {
    effective: string;
    overridden: boolean;
    recommendations: readonly AccentRecommendation[];
    selectedIsCustom: boolean;
  };
  statusRows: { slot: StatusSlot; hex: string; overridden: boolean }[];
  isOverridden: boolean;
  overrideCount: number;
} {
  const archetype = ARCHETYPE_PALETTES[state.preset];
  const overrides = state.paletteOverrides;
  const effectiveBase = resolveBaseScale(state.preset, overrides);
  const effectivePalette = resolvePalette(state.preset, overrides);

  const baseStops: ColorScaleStop[] = NEUTRAL_STOPS.map((stop) => ({
    key: stop,
    hex: effectiveBase[stop],
    overridden: archetype.baseScale[stop] !== effectiveBase[stop],
  }));

  const refRows = <S extends SurfaceSlot | TextSlot>(
    slots: readonly S[],
    refs: Record<S, NeutralStop>,
  ) =>
    slots.map((slot) => {
      const stop = refs[slot];
      const hex = effectiveBase[stop];
      return {
        title: slot,
        hex,
        subtitle: `neutral.${stop}`,
        overridden: archetype.baseScale[stop] !== hex,
      };
    });

  const accentEffective = effectivePalette.accent;
  const accentOverridden = accentEffective !== archetype.accent;
  const recs = archetype.recommendedAccents;
  const selectedIsCustom = !recs.some((r) => r.hex === accentEffective);

  const statusRows = STATUS_SLOTS.map((slot) => ({
    slot,
    hex: effectivePalette[slot],
    overridden: archetype.status[slot] !== effectivePalette[slot],
  }));

  const overrideCount =
    Object.keys(overrides?.baseScale ?? {}).length +
    (overrides?.accent !== undefined ? 1 : 0) +
    Object.keys(overrides?.status ?? {}).length;

  return {
    baseStops,
    surfaceRows: refRows(SURFACE_SLOTS, archetype.surfaceRefs),
    textRows: refRows(TEXT_SLOTS, archetype.textRefs),
    accent: {
      effective: accentEffective,
      overridden: accentOverridden,
      recommendations: recs,
      selectedIsCustom,
    },
    statusRows,
    isOverridden: overrideCount > 0,
    overrideCount,
  };
}

// ─── Sections ──────────────────────────────────────────────────────────────

function AccentSection({
  effective,
  overridden,
  recommendations,
  selectedIsCustom,
  onChange,
}: {
  effective: string;
  overridden: boolean;
  recommendations: readonly AccentRecommendation[];
  selectedIsCustom: boolean;
  onChange: (hex: string) => void;
}) {
  return (
    <Section label="Accent" overridden={overridden}>
      {recommendations.map((rec) => (
        <ColorRow
          key={rec.hex}
          hex={rec.hex}
          title={rec.source}
          subtitle={rec.hex}
          selected={effective === rec.hex}
          onSelect={() => onChange(rec.hex)}
        />
      ))}
      <ColorRow
        hex={effective}
        title="Custom"
        subtitle={effective}
        selected={selectedIsCustom}
        onPick={onChange}
      />
    </Section>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────

export function ColorPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const archetype = ARCHETYPE_PALETTES[state.preset];
  const overrides = state.paletteOverrides;
  const adapters = buildAdapters(state);

  function setBaseStop(stopKey: string, hex: string) {
    const stop = stopKey as NeutralStop;
    const baselineHex = archetype.baseScale[stop];
    const nextBase = { ...(overrides?.baseScale ?? {}) };
    if (hex === baselineHex) delete nextBase[stop];
    else nextBase[stop] = hex;
    const next: PaletteOverrides = {
      ...(overrides ?? {}),
      baseScale: Object.keys(nextBase).length ? nextBase : undefined,
    };
    if (!next.baseScale) delete next.baseScale;
    onChange({ paletteOverrides: Object.keys(next).length ? next : undefined });
  }

  function setAccent(hex: string) {
    const next: PaletteOverrides = { ...(overrides ?? {}) };
    if (hex === archetype.accent) delete next.accent;
    else next.accent = hex;
    onChange({ paletteOverrides: Object.keys(next).length ? next : undefined });
  }

  function setStatus(slot: StatusSlot, hex: string) {
    const baselineHex = archetype.status[slot];
    const nextStatus = { ...(overrides?.status ?? {}) };
    if (hex === baselineHex) delete nextStatus[slot];
    else nextStatus[slot] = hex;
    const next: PaletteOverrides = {
      ...(overrides ?? {}),
      status: Object.keys(nextStatus).length ? nextStatus : undefined,
    };
    if (!next.status) delete next.status;
    onChange({ paletteOverrides: Object.keys(next).length ? next : undefined });
  }

  function resetCategory() {
    onChange({ paletteOverrides: undefined });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
          Color
          {adapters.isOverridden && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-neutral-900"
              title="Override"
            />
          )}
        </div>
        <div className="text-2xs text-neutral-500">
          Palette anchored on{" "}
          <span className="font-medium">{state.preset}</span>
          {adapters.isOverridden &&
            ` · ${adapters.overrideCount} override${adapters.overrideCount > 1 ? "s" : ""}`}
        </div>
      </div>

      {/* <Section label="Base scale">
        <ColorScaleStrip stops={adapters.baseStops} onPick={setBaseStop} />
      </Section>

      <Section label="Surface">
        {adapters.surfaceRows.map((row) => (
          <ColorRow key={row.title} {...row} />
        ))}
      </Section>

      <Section label="Text">
        {adapters.textRows.map((row) => (
          <ColorRow key={row.title} {...row} />
        ))}
      </Section> */}

      <AccentSection
        effective={adapters.accent.effective}
        overridden={adapters.accent.overridden}
        recommendations={adapters.accent.recommendations}
        selectedIsCustom={adapters.accent.selectedIsCustom}
        onChange={setAccent}
      />

      <Section label="Status">
        {adapters.statusRows.map((row) => (
          <ColorRow
            key={row.slot}
            hex={row.hex}
            title={row.slot}
            subtitle={row.hex}
            overridden={row.overridden}
            onPick={(hex) => setStatus(row.slot, hex)}
          />
        ))}
      </Section>

      {adapters.isOverridden && (
        <div className="pt-1">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
