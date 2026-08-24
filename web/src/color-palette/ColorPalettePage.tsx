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
import { DownloadRow } from "./DownloadRow";
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

  // 뱃지는 hover 프리뷰까지 보여준다(shownScales) — 이동 제안은 확정 팔레트만
  // 본다(scales). hover는 미리보기일 뿐 확정이 아니라는 이 화면의 계약이 여기도
  // 적용된다: hover 중에 "한 번에 고치기"를 눌러도 확정 색 기준 이동이 적용돼야
  // 한다(Task 12의 다운로드가 shownScales가 아니라 scales를 쓰는 것과 같은 원칙).
  const checks = useMemo(() => checkContrast(shownScales, roles), [shownScales, roles]);
  // 뱃지는 hover 프리뷰(shownScales)를 보고, 스크린리더 요약(status)은 확정
  // 팔레트(scales)를 본다 — hover는 미리보기일 뿐 확정이 아니라는 이 화면의
  // 계약이 통지에도 적용된다.
  const summaryChecks = useMemo(() => checkContrast(scales, roles), [scales, roles]);
  const shifts = useMemo(() => suggestRoleShifts(scales, roles), [scales, roles]);
  const hasApplied = state.shifts.length > 0;
  const onApplyShifts = () =>
    setState((s) => ({
      ...s,
      shifts: shifts.map(({ roleId, theme, to }) => ({ roleId, theme, to })),
    }));
  const onResetShifts = () => setState((s) => ({ ...s, shifts: [] }));

  return (
    <div
      className="mx-auto grid max-w-[1200px] grid-cols-1 items-start
                 lg:grid-cols-[1fr_380px]"
      style={{ padding: "var(--ds-space-lg)", gap: "var(--ds-space-xl)" }}
    >
      <main style={{ display: "grid", gap: "var(--ds-space-lg)" }}>
        <h1 className="ds-type-heading-sm">컬러 팔레트</h1>

        <section style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
          <h2 className="ds-type-heading-xxs">① 앵커 정하기</h2>
          <AccentInput
            hex={state.accentHex}
            onChange={(accentHex) => setState((s) => withAccent(s, accentHex))}
          />
        </section>

        <section style={{ display: "grid", gap: "var(--ds-space-md)" }}>
          <h2 className="ds-type-heading-xxs">② 만들어진 팔레트</h2>

          <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
            <div className="ds-type-caption-sm text-neutral-500">액센트</div>
            <AdjustableScale
              hexes={scales.accent}
              adjustable={[...ADJUSTABLE_STOPS]}
              pinned={pinned}
              // stop 50은 거의 흰 칩이라 그림자가 "아래 테두리"로 읽힌다 —
              // 확대 확인 후 테두리만 neutral-400으로 강화(스펙 D9,
              // AdjustableScale의 boundaryEmphasis 주석 참조).
              boundaryEmphasis={[0]}
              onPick={(i) => { setOpen(open === i ? null : i); setHover(null); }}
              preview={open !== null && hover ? previewScale(state, open, hover) : null}
              openIndex={open}
              onClosePopover={() => { setOpen(null); setHover(null); }}
              popoverContent={
                open !== null ? (
                  <CandidatePopover
                    stopIndex={open}
                    state={state}
                    onHover={setHover}
                    onChoose={(hex) =>
                      setState((s) => ({ ...s, pins: { ...s.pins, [open]: hex ?? undefined } }))
                    }
                    onClose={() => { setOpen(null); setHover(null); }}
                  />
                ) : undefined
              }
            />
          </div>

          <div style={{ display: "grid", gap: "var(--ds-space-xs)" }}>
            <div className="ds-type-caption-sm text-neutral-500">뉴트럴</div>
            <AdjustableScale hexes={scales.neutral} adjustable={[]} pinned={[]} />
            <NeutralControl
              state={state}
              onChange={(tint) => setState((s) => ({ ...s, tint }))}
            />
          </div>

          {/* 상태색은 접지 않는다 — 산출물에 무조건 들어가므로 화면에 없으면
              받아간 파일에 모르는 색이 들어있게 된다 (사이클 3 D7). 라벨을 왼쪽
              열로 빼고 띠를 compact로 낮춰 세로를 아낀다 (스펙 D3). */}
          <div
            data-testid="semantic-section"
            style={{ display: "grid", gap: "var(--ds-space-xxs)" }}
          >
            <div className="ds-type-caption-sm text-neutral-500">상태색</div>
            {SEMANTIC_ANCHORS.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[56px_1fr] items-center"
                style={{ gap: "var(--ds-space-xs)" }}
              >
                <div className="ds-type-caption-sm text-neutral-400">{a.label}</div>
                <AdjustableScale
                  hexes={scales.semantic[a.id]}
                  adjustable={[]}
                  pinned={[]}
                  showCaptions={false}
                  compact
                />
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
          <h2 className="ds-type-heading-xxs">③ 받기</h2>
          <DownloadRow scales={scales} roles={roles} />
        </section>
      </main>

      <aside className="lg:sticky lg:top-8">
        <PreviewPane
          scales={shownScales}
          roles={roles}
          checks={checks}
          shifts={shifts}
          hasApplied={hasApplied}
          onApplyShifts={onApplyShifts}
          onResetShifts={onResetShifts}
          summaryChecks={summaryChecks}
        />
      </aside>
    </div>
  );
}
