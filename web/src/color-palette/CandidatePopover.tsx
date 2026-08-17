// web/src/color-palette/CandidatePopover.tsx
//
// 후보 3개. hover(또는 키보드 포커스)하면 팔레트와 목업이 그 색으로 다시
// 그려지고(확정 아님), 클릭해야 확정된다 — 고르기 전에 결과를 본다 (스펙 D3).
// 후보의 note(교보재 카피)는 이 화면에서 읽지 않는다 (스펙 D9).
// 이 컴포넌트는 목록만 그린다 — 뜨는 껍데기는 components/Popover가 진다.

import { candidatesFor, type Candidate } from "@core/color/candidates.js";
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

/** 밝은 stop(0)이나 좁은 hue에서는 sRGB gamut이 좁아, 채도 배율이 서로 다른 후보들도
 *  같은 상한으로 클램프돼 같은 hex가 된다 — hex 기준으로 중복 제거하고 먼저 나온
 *  것만 남긴다. candidatesFor의 순서(중립적→균형→색이 드러나는, 차분한→균형→쨍한)가
 *  의미 있는 순서라 임의로 고르면 라벨이 자리마다 달라진다. 다 겹치면(예: 기본 파랑
 *  액센트의 stop 3) 라디오 1개만 남는다 — "고를 게 없다"는 사실 자체가 정보라
 *  별도 문구는 붙이지 않는다(D9).
 */
function dedupeByHex(candidates: readonly Candidate[]): { hex: string; label: string }[] {
  const seen = new Set<string>();
  const out: { hex: string; label: string }[] = [];
  for (const cd of candidates) {
    const hex = oklchToHex(cd.color);
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push({ hex, label: cd.label });
  }
  return out;
}

export function CandidatePopover({ stopIndex, state, onHover, onChoose, onClose }: Props) {
  const pins = contextPins(state, stopIndex);
  const candidates = dedupeByHex(candidatesFor(stopIndex, pins));
  const current = state.pins[stopIndex as 0 | 3 | 7 | 10];

  return (
    // 카드 크롬(테두리·그림자·여백)은 이제 Popover 패널이 진다. 여기는 목록만
    // 남는다 — 크롬이 둘이면 테두리가 겹쳐 보인다.
    <div onMouseLeave={() => onHover(null)}>
      {candidates.map((cd) => {
        const hex = cd.hex;
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
              // hover의 키보드 대응물. Tab으로 라디오 그룹에 들어오는 것은 선택을
              // 바꾸지 않으므로, 여기서 프리뷰를 띄워야 "고르기 전에 결과를 본다"가
              // 키보드에서도 성립한다. (화살표 키는 네이티브 규칙대로 이동 즉시
              // 선택 = 확정이다 — 그건 남는 한계로, 스펙 "알려진 한계" 3번.)
              onFocus={() => onHover(hex)}
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
