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
import { OklchPicker } from "../../components/OklchPicker";
import { formatOklchCompact } from "../../lib/oklch";
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
      <div className="text-2xs text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
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
  onChange,
}: {
  effective: string;
  overridden: boolean;
  recommendations: readonly AccentRecommendation[];
  onChange: (hex: string) => void;
}) {
  const matchedBrand = recommendations.find(
    (r) => r.hex.toLowerCase() === effective.toLowerCase(),
  );
  const oklch = formatOklchCompact(effective);
  return (
    <Section label="Accent" overridden={overridden}>
      <div className="flex items-stretch gap-2">
        <div
          className="w-8 h-8 rounded shrink-0 ring ring-neutral-500 ring-offset-1"
          title={`${matchedBrand ? matchedBrand.source : "Custom"} · ${effective}`}
          style={{ background: effective }}
        />
        <div className="font-mono text-2xs text-neutral-500 truncate mt-2 mb-3">
          {matchedBrand ? matchedBrand.source : "Custom"} · {effective}
          {oklch ? ` · ${oklch}` : ""}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 mb-4 flex-wrap">
        {recommendations.map((rec) => {
          const active = rec.hex.toLowerCase() === effective.toLowerCase();
          return (
            <button
              key={rec.hex}
              type="button"
              onClick={() => onChange(rec.hex)}
              title={`${rec.source} · ${rec.hex}`}
              className={[
                "w-8 h-8 rounded transition-all shrink-0",
                active
                  ? "ring ring-neutral-400 ring-offset-1"
                  : "border border-neutral-200 hover:border-neutral-400",
              ].join(" ")}
              style={{ background: rec.hex }}
            />
          );
        })}
      </div>

      <OklchPicker hex={effective} onChange={onChange} />
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
