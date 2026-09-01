// web/src/color-palette/NeutralControl.tsx
//
// 틴트 어트랙터 5개 + 강도 2단. 기본은 액센트 hue에서 스냅된 자리이고,
// 사용자가 다른 칩으로 덮을 수 있다. 어느 칩이 자동으로 붙은 자리인지는
// 칩 옆 점(•) 표식으로만 알린다 — 판단(스냅)은 엔진이 하고 여긴 렌더만 한다.

import { TINT_ATTRACTORS, snapTint } from "@core/color/neutral.js";
import { parsePrimary } from "@core/generator/color.js";
import type { PaletteState } from "./paletteState";

interface Props {
  readonly state: PaletteState;
  readonly onChange: (tint: PaletteState["tint"]) => void;
}

export function NeutralControl({ state, onChange }: Props) {
  const snapped = snapTint(parsePrimary(state.accentHex).h);
  const activeId = state.tint?.attractorId ?? snapped.id;
  const strength = state.tint?.strength ?? "soft";
  const achromatic = activeId === "achromatic";

  return (
    // 라벨을 칩 위가 아니라 **같은 행**에 둔다(스펙 D2) — "색조"·"강도"는 각각
    // 두 글자인데 칩 위에 한 줄씩 앉아 세로 2행을 먹고 있었다. 라벨은 제자리에
    // 남고 칩만 flex-wrap으로 접히므로 좁은 화면에서도 라벨이 칩과 갈리지 않는다.
    <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
      <div className="flex items-center gap-2">
        {/* 라벨 색은 neutral-500이다 — 400은 흰 배경에서 2.58:1로 미달이다.
           어느 축을 고르는지 못 읽으면 칩이 무슨 뜻인지 알 수 없으므로 장식이
           아니다 (직전 스펙 D2). shrink-0이 없으면 칩이 밀 때 라벨이 줄바꿈된다. */}
        <div className="ds-type-caption-sm text-neutral-500 shrink-0">색조</div>
        {/* role="group"만 쓰고 radiogroup을 쓰지 않는 이유: APG 라디오 패턴은
           roving tabindex + 화살표 이동=선택을 요구하는데, 그 함정(방향키 한 번이
           곧 확정이라 "고르기 전에 결과를 본다"가 깨지는 것)은 이 화면이
           CandidatePopover에서 이미 밟았다(사이클 3.2 알려진 한계 3). */}
        <div role="group" aria-label="뉴트럴 색조" className="flex flex-wrap gap-1.5">
          {TINT_ATTRACTORS.map((a) => (
            <button
              key={a.id}
              type="button"
              // aria-label이 visible text(점 표식 포함)를 덮어써서 스크린리더에는
              // 시각적 "•" 채널이 없다 — 자동 스냅 여부를 라벨 문구에 직접 반영한다.
              aria-label={a.id === snapped.id ? `${a.label} (자동)` : a.label}
              aria-pressed={activeId === a.id}
              onClick={() => onChange({ attractorId: a.id, strength })}
              className={`rounded px-2 py-1 ds-type-caption-sm border ${
                activeId === a.id
                  ? "border-neutral-900 font-medium"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {a.label}
              {a.id === snapped.id && (
                // 점 표식 색도 neutral-500이다 — 어느 칩이 자동으로 붙은 것인지
                // 못 읽으면 알 수 없으므로 장식이 아니다.
                <span className="ml-1 text-neutral-500">•</span>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* 무채색에는 강도가 없다 — 행이 통째로 사라지고 아래가 당겨진다.
         이 화면에서 조건부로 사라지는 유일한 컨트롤이다(스펙 알려진 한계 4). */}
      {!achromatic && (
        <div className="flex items-center gap-2">
          <div className="ds-type-caption-sm text-neutral-500 shrink-0">강도</div>
          <div role="group" aria-label="강도" className="flex items-center gap-1.5">
            {(["soft", "strong"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={strength === s}
                onClick={() => onChange({ attractorId: activeId, strength: s })}
                className={`rounded px-2 py-0.5 ds-type-caption-sm border ${
                  strength === s ? "border-neutral-900 font-medium" : "border-neutral-200"
                }`}
              >
                {s === "soft" ? "은은" : "뚜렷"}
              </button>
            ))}
          </div>
          {/* 칩이든 강도든 한 번 누르면 어트랙터가 확정된다(state.tint !== null) —
             액센트를 나중에 바꿔도 자동 스냅으로 돌아가지 못하는 함정이 되지
             않도록 되돌릴 길을 둔다. "자동으로"는 선택지가 아니라 되돌리기라
             강도 그룹 **밖**에 둔다. 링크 색 neutral-500도 대비 하한이다. */}
          {state.tint && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ds-type-caption-sm text-neutral-500 hover:text-neutral-700 underline"
            >
              자동으로
            </button>
          )}
        </div>
      )}
      {/* 무채색이면 강도 행이 없으므로 "자동으로"도 갈 곳이 없다 — 되돌릴 길이
         사라지면 함정이 된다. 그래서 이 경우에만 따로 한 줄 세운다. */}
      {achromatic && state.tint && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ds-type-caption-sm text-neutral-500 hover:text-neutral-700 underline justify-self-start"
        >
          자동으로
        </button>
      )}
    </div>
  );
}
