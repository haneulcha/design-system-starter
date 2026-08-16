// web/src/color-palette/NeutralControl.tsx
//
// 틴트 어트랙터 5개 + 강도 2단. 기본은 액센트 hue에서 스냅된 자리이고,
// 사용자가 다른 칩으로 덮을 수 있다. 어느 칩이 자동으로 붙은 자리인지는
// 표식으로 알린다 — 판단(스냅)은 엔진이 하고 여긴 렌더만 한다.

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
      <div className="flex flex-wrap gap-1.5">
        {TINT_ATTRACTORS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-label={a.label}
            onClick={() => onChange({ attractorId: a.id, strength })}
            className={`rounded px-2 py-1 text-[11px] border ${
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
      <div className="flex items-center gap-2">
        <span data-testid="snapped-tint" className="text-[10px] text-neutral-400">
          • = 당신의 액센트에서 자동으로 붙은 자리 ({snapped.label})
        </span>
      </div>
      {!achromatic && (
        <div className="flex gap-1.5">
          {(["soft", "strong"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ attractorId: activeId, strength: s })}
              className={`rounded px-2 py-0.5 text-[11px] border ${
                strength === s ? "border-neutral-900 font-medium" : "border-neutral-200"
              }`}
            >
              {s === "soft" ? "은은" : "뚜렷"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
