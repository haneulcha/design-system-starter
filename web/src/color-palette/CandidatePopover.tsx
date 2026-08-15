// web/src/color-palette/CandidatePopover.tsx
//
// 후보 3개. hover하면 팔레트와 목업이 그 색으로 다시 그려지고(확정 아님),
// 클릭해야 확정된다 — 고르기 전에 결과를 본다 (스펙 D3).
// 후보의 note(교보재 카피)는 이 화면에서 읽지 않는다 (스펙 D9).

import { candidatesFor } from "@core/color/candidates.js";
import { fillScale, type Pin } from "@core/color/scale.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";
import { ADJUSTABLE_STOPS, type PaletteState } from "./paletteState";

interface Props {
  readonly stopIndex: number;
  readonly state: PaletteState;
  readonly onHover: (hex: string | null) => void;
  readonly onChoose: (hex: string | null) => void;
  readonly onClose: () => void;
}

/** 이 stop을 뺀 나머지 확정 pin — 후보는 그 문맥 위에서 계산된다. */
function contextPins(state: PaletteState, stopIndex: number): Pin[] {
  const anchor: Pin = { index: 5, color: parsePrimary(state.accentHex) };
  const rest = ADJUSTABLE_STOPS.flatMap((i) => {
    const hex = state.pins[i];
    return i !== stopIndex && hex ? [{ index: i, color: parsePrimary(hex) }] : [];
  });
  return [anchor, ...rest];
}

export function CandidatePopover({ stopIndex, state, onHover, onChoose, onClose }: Props) {
  const pins = contextPins(state, stopIndex);
  const candidates = candidatesFor(stopIndex, pins);
  const current = state.pins[stopIndex as 0 | 3 | 7 | 10];

  return (
    <div
      className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 shadow-lg"
      onMouseLeave={() => onHover(null)}
    >
      {candidates.map((cd) => {
        const hex = oklchToHex(cd.color);
        return (
          <label
            key={cd.label}
            className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-neutral-50"
            onMouseEnter={() => onHover(hex)}
          >
            <input
              type="radio"
              name={`cand-${stopIndex}`}
              checked={current === hex}
              onChange={() => { onChoose(hex); onClose(); }}
            />
            <span
              className="inline-block w-5 h-5 rounded-sm border border-neutral-200"
              style={{ background: hex }}
            />
            <span className="text-xs">{cd.label}</span>
          </label>
        );
      })}
      <button
        type="button"
        className="mt-1 w-full rounded px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50"
        onClick={() => { onChoose(null); onClose(); }}
      >
        기본으로
      </button>
    </div>
  );
}

/** hover 중인 후보를 끼운 미리보기 스케일. 확정 상태를 건드리지 않는다. */
export function previewScale(
  state: PaletteState,
  stopIndex: number,
  hex: string,
): string[] {
  return fillScale([
    ...contextPins(state, stopIndex),
    { index: stopIndex, color: parsePrimary(hex) },
  ]).map(oklchToHex);
}
