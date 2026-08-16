import { useEffect, useMemo, useState } from "react";
import { checkContrast, suggestRoleShifts } from "@core/color/contrast.js";
import { SEMANTIC_ANCHORS } from "@core/color/semantic.js";
import {
  ADJUSTABLE_STOPS, deriveRoles, deriveScales, withAccent, type PaletteState,
} from "./paletteState";
import { parse, serialize } from "./paletteUrl";
import { AccentInput } from "./AccentInput";
import { AdjustableScale } from "./AdjustableScale";
import { CandidatePopover, previewScale } from "./CandidatePopover";
import { NeutralControl } from "./NeutralControl";
import { PreviewPane } from "./PreviewPane";

export function ColorPalettePage() {
  const [state, setState] = useState<PaletteState>(() => parse(window.location.search));
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // replaceState다 — 클릭마다 히스토리가 쌓이면 뒤로가기가 조정 하나하나를 되짚는다.
  useEffect(() => {
    window.history.replaceState({}, "", `${window.location.pathname}${serialize(state)}`);
  }, [state]);

  const scales = useMemo(() => deriveScales(state), [state]);
  const roles = useMemo(() => deriveRoles(state), [state]);
  const pinned = ADJUSTABLE_STOPS.filter((i) => state.pins[i] !== undefined);
  const shownScales = useMemo(
    () =>
      open !== null && hover
        ? { ...scales, accent: previewScale(state, open, hover) }
        : scales,
    [scales, open, hover, state],
  );

  const checks = useMemo(() => checkContrast(shownScales, roles), [shownScales, roles]);
  const shifts = useMemo(() => suggestRoleShifts(shownScales, roles), [shownScales, roles]);
  const hasApplied = state.shifts.length > 0;
  const onApplyShifts = () =>
    setState((s) => ({
      ...s,
      shifts: shifts.map(({ roleId, theme, to }) => ({ roleId, theme, to })),
    }));
  const onResetShifts = () => setState((s) => ({ ...s, shifts: [] }));

  return (
    <div className="max-w-5xl mx-auto p-8 grid grid-cols-[1fr_320px] gap-8 items-start">
      <div className="space-y-6">
        <h1 className="text-lg font-semibold">컬러 팔레트</h1>
        <AccentInput
          hex={state.accentHex}
          onChange={(accentHex) => setState((s) => withAccent(s, accentHex))}
        />
        <section className="space-y-1">
          <h2 className="text-xs font-medium text-neutral-500">액센트</h2>
          <AdjustableScale
            hexes={scales.accent}
            adjustable={[...ADJUSTABLE_STOPS]}
            pinned={pinned}
            onPick={(i) => { setOpen(open === i ? null : i); setHover(null); }}
            preview={open !== null && hover ? previewScale(state, open, hover) : null}
          />
          {open !== null && (
            <CandidatePopover
              stopIndex={open}
              state={state}
              onHover={setHover}
              onChoose={(hex) =>
                setState((s) => ({ ...s, pins: { ...s.pins, [open]: hex ?? undefined } }))
              }
              onClose={() => { setOpen(null); setHover(null); }}
            />
          )}
        </section>
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-neutral-500">뉴트럴</h2>
          <AdjustableScale hexes={scales.neutral} adjustable={[]} pinned={[]} />
          <NeutralControl
            state={state}
            onChange={(tint) => setState((s) => ({ ...s, tint }))}
          />
        </section>
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-neutral-500">상태색</h2>
          {SEMANTIC_ANCHORS.map((a) => (
            <div key={a.id}>
              <div className="text-[10px] text-neutral-400">{a.label}</div>
              <AdjustableScale hexes={scales.semantic[a.id]} adjustable={[]} pinned={[]} />
            </div>
          ))}
        </section>
      </div>
      <div className="sticky top-8">
        <PreviewPane
          scales={shownScales}
          roles={roles}
          checks={checks}
          shifts={shifts}
          hasApplied={hasApplied}
          onApplyShifts={onApplyShifts}
          onResetShifts={onResetShifts}
        />
      </div>
    </div>
  );
}
