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
    <div className="space-y-2">
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">색조</div>
        {/* role="group"만 쓰고 radiogroup을 쓰지 않는 이유: APG 라디오 패턴은
           roving tabindex + 화살표 이동=선택을 요구하는데, 그 함정(방향키 한 번이
           곧 확정이라 "고르기 전에 결과를 본다"가 깨지는 것)은 이 화면이
           CandidatePopover에서 이미 밟았다(사이클 3.2 알려진 한계 3). 여기 버튼들은
           독립 토글이지 상호배타 라디오가 아니므로 group + aria-pressed로 충분하다. */}
        <div role="group" aria-label="뉴트럴 색조" className="flex flex-wrap gap-1.5">
          {TINT_ATTRACTORS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-label={a.label}
              aria-pressed={activeId === a.id}
              onClick={() => onChange({ attractorId: a.id, strength })}
              className={`rounded px-2 py-1 ds-type-caption-sm border ${
                activeId === a.id
                  ? "border-neutral-900 font-medium"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {a.label}
              {a.id === snapped.id && <span className="ml-1 text-neutral-400">•</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {!achromatic && (
          <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
            <div className="ds-type-caption-sm text-neutral-500">강도</div>
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
          </div>
        )}
        {/* 칩이든 강도든 한 번 누르면 어트랙터가 확정된다(state.tint !== null) —
           액센트를 나중에 바꿔도 자동 스냅으로 돌아가지 못하는 함정이 되지
           않도록, 확정된 상태에서만 되돌릴 길을 둔다. "자동으로"는 선택지가
           아니라 되돌리기라 강도 그룹 밖에 둔다. */}
        {state.tint && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ds-type-caption-sm text-neutral-400 hover:text-neutral-600 underline"
          >
            자동으로
          </button>
        )}
      </div>
    </div>
  );
}
