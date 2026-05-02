import type { WizardState } from "../../hooks/useGenerator";
import type {
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
import { ResetButton } from "../ResetButton";

// ─── Atoms ──────────────────────────────────────────────────────────────────

function ColorInput({
  value,
  onChange,
  size = 24,
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded cursor-pointer border border-neutral-200 p-0.5 bg-white shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function OverrideDot({ on }: { on: boolean }) {
  return on ? <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 inline-block" title="Override" /> : null;
}

// ─── Sections ───────────────────────────────────────────────────────────────

function BaseScaleSection({
  effective,
  baseline,
  onStopChange,
}: {
  effective: Record<NeutralStop, string>;
  baseline: Record<NeutralStop, string>;
  onStopChange: (stop: NeutralStop, hex: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">Base scale</div>
      <div className="grid grid-cols-9 gap-0.5">
        {NEUTRAL_STOPS.map((stop) => {
          const hex = effective[stop];
          const overridden = baseline[stop] !== hex;
          return (
            <label key={stop} className="block cursor-pointer" title={`neutral.${stop} · ${hex}`}>
              <input
                type="color"
                value={hex}
                onChange={(e) => onStopChange(stop, e.target.value)}
                className="sr-only"
              />
              <div
                className="h-9 first:rounded-l last:rounded-r border border-neutral-200"
                style={{ background: hex }}
              />
              <div className="text-[8px] font-mono text-center text-neutral-500 mt-0.5">
                {stop}{overridden ? "●" : ""}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlyRefSection<S extends SurfaceSlot | TextSlot>({
  label,
  slots,
  refs,
  effective,
}: {
  label: string;
  slots: readonly S[];
  refs: Record<S, NeutralStop>;
  effective: Record<NeutralStop, string>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">{label}</div>
      <div className="space-y-1">
        {slots.map((slot) => {
          const hex = effective[refs[slot]];
          return (
            <div key={slot} className="flex items-center gap-2 px-2 py-1">
              <div
                className="w-6 h-6 rounded border border-neutral-200 shrink-0"
                style={{ background: hex }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-neutral-900 truncate">
                  {slot}
                  <span className="ml-1.5 text-[10px] text-neutral-400 font-mono">→ neutral.{refs[slot]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccentSection({
  effective,
  baseline,
  recommendations,
  onChange,
}: {
  effective: string;
  baseline: string;
  recommendations: readonly string[];
  onChange: (hex: string) => void;
}) {
  const overridden = effective !== baseline;
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">
        Accent
        {overridden && <span className="ml-1.5"><OverrideDot on /></span>}
      </div>
      <div className="flex items-center gap-1.5">
        {recommendations.map((hex) => {
          const selected = effective === hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              title={hex}
              className={[
                "w-9 h-9 rounded transition-all",
                selected ? "ring-2 ring-neutral-900 ring-offset-2" : "border border-neutral-200 hover:border-neutral-400",
              ].join(" ")}
              style={{ background: hex }}
            />
          );
        })}
        <label
          className="w-9 h-9 rounded border border-dashed border-neutral-300 hover:border-neutral-500 cursor-pointer flex items-center justify-center relative"
          title="Custom hex"
        >
          <input
            type="color"
            value={effective}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <div className="w-4 h-4 rounded" style={{ background: effective }} />
          <span className="absolute -bottom-3.5 text-[8px] text-neutral-400 uppercase tracking-wider">
            custom
          </span>
        </label>
      </div>
      <div className="font-mono text-[10px] text-neutral-500 px-1 pt-3">{effective}</div>
    </div>
  );
}

function StatusSection({
  effective,
  baseline,
  onSlotChange,
}: {
  effective: Record<StatusSlot, string>;
  baseline: Record<StatusSlot, string>;
  onSlotChange: (slot: StatusSlot, hex: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">Status</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {STATUS_SLOTS.map((slot) => {
          const hex = effective[slot];
          const overridden = baseline[slot] !== hex;
          return (
            <div key={slot} className="flex items-center gap-1.5 px-1">
              <ColorInput value={hex} onChange={(v) => onSlotChange(slot, v)} size={20} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-neutral-900 truncate flex items-center gap-1">
                  {slot}
                  <OverrideDot on={overridden} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

export function ColorPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const archetype = ARCHETYPE_PALETTES[state.preset];
  const overrides = state.paletteOverrides;
  const effectiveBase = resolveBaseScale(state.preset, overrides);
  const effectivePalette = resolvePalette(state.preset, overrides);
  const overrideCount =
    Object.keys(overrides?.baseScale ?? {}).length +
    (overrides?.accent !== undefined ? 1 : 0) +
    Object.keys(overrides?.status ?? {}).length;
  const isOverridden = overrideCount > 0;

  function patch(p: PaletteOverrides) {
    const next: PaletteOverrides = {
      baseScale: { ...overrides?.baseScale, ...p.baseScale },
      status:    { ...overrides?.status,    ...p.status    },
      ...(p.accent !== undefined ? { accent: p.accent } : overrides?.accent !== undefined ? { accent: overrides.accent } : {}),
    };
    if (next.baseScale && Object.keys(next.baseScale).length === 0) delete next.baseScale;
    if (next.status    && Object.keys(next.status   ).length === 0) delete next.status;
    onChange({ paletteOverrides: Object.keys(next).length ? next : undefined });
  }

  function setBaseStop(stop: NeutralStop, hex: string) {
    const baselineHex = archetype.baseScale[stop];
    const nextBase = { ...(overrides?.baseScale ?? {}) };
    if (hex === baselineHex) delete nextBase[stop];
    else nextBase[stop] = hex;
    const next: PaletteOverrides = { ...(overrides ?? {}), baseScale: Object.keys(nextBase).length ? nextBase : undefined };
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
    const next: PaletteOverrides = { ...(overrides ?? {}), status: Object.keys(nextStatus).length ? nextStatus : undefined };
    if (!next.status) delete next.status;
    onChange({ paletteOverrides: Object.keys(next).length ? next : undefined });
  }

  function resetCategory() {
    onChange({ paletteOverrides: undefined });
  }

  // Status effective computed from resolved palette.
  const effectiveStatus = Object.fromEntries(
    STATUS_SLOTS.map((slot) => [slot, effectivePalette[slot]]),
  ) as Record<StatusSlot, string>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
            Color
            <OverrideDot on={isOverridden} />
          </div>
          <div className="text-[11px] text-neutral-500">
            Palette anchored on <span className="font-medium">{state.preset}</span>
            {isOverridden && ` · ${overrideCount} override${overrideCount > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      <BaseScaleSection
        effective={effectiveBase}
        baseline={archetype.baseScale}
        onStopChange={setBaseStop}
      />

      <ReadOnlyRefSection label="Surface" slots={SURFACE_SLOTS} refs={archetype.surfaceRefs} effective={effectiveBase} />
      <ReadOnlyRefSection label="Text"    slots={TEXT_SLOTS}    refs={archetype.textRefs}    effective={effectiveBase} />

      <AccentSection
        effective={effectivePalette.accent}
        baseline={archetype.accent}
        recommendations={archetype.recommendedAccents}
        onChange={setAccent}
      />

      <StatusSection
        effective={effectiveStatus}
        baseline={archetype.status}
        onSlotChange={setStatus}
      />

      {isOverridden && (
        <div className="pt-1">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
