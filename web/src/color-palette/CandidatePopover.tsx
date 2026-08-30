// web/src/color-palette/CandidatePopover.tsx
//
// 후보 3개. hover(또는 키보드 포커스)하면 팔레트와 목업이 그 색으로 다시
// 그려지고(확정 아님), 클릭해야 확정된다 — 고르기 전에 결과를 본다 (스펙 D3).
// 후보의 note(교보재 카피)는 이 화면에서 읽지 않는다 (스펙 D9).
// 이 컴포넌트는 목록만 그린다 — 뜨는 껍데기는 components/Popover가 진다.

import { candidatesFor, type Candidate } from "@core/color/candidates.js";
import { fillScale, type Pin } from "@core/color/scale.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";
import { isCurrent } from "./candidateMatch";
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
 *  의미 있는 순서라 임의로 고르면 라벨이 자리마다 달라진다.
 *
 *  2026-08-30 판단 변경: 이 자리 주석은 "'고를 게 없다'는 사실 자체가 정보라
 *  별도 문구는 붙이지 않는다(사이클 3 D9)"였다. 사이클 3 D9의 부분 개정으로
 *  경계선을 다시 그었다 — "왜 이 색이 좋은가"(학습)는 계속 안 싣고,
 *  "왜 고를 게 없나"(조작 사실)는 싣는다. 실제로 stop 300에서 라디오 1개만
 *  남는 화면은 정보가 아니라 고장으로 읽혔다. 후보의 note(교보재 카피)는
 *  여전히 안 싣는다 — 그건 #builder의 몫이다.
 *
 *  이 사유 문구를 candidatesFor의 note가 아니라 여기서 새로 만드는 이유:
 *  엔진의 겹침 판정은 oklch 키 기준이고 이 함수의 중복 제거는 hex 기준이라,
 *  hex는 같은데 oklch 키가 달라 엔진이 note를 안 붙이는 경우가 있다. 몇 개를
 *  지웠는지 아는 유일한 자리가 여기다.
 */
function dedupeByHex(
  candidates: readonly Candidate[],
): { items: { hex: string; label: string }[]; collapsed: number } {
  const seen = new Set<string>();
  const items: { hex: string; label: string }[] = [];
  for (const cd of candidates) {
    const hex = oklchToHex(cd.color);
    if (seen.has(hex)) continue;
    seen.add(hex);
    items.push({ hex, label: cd.label });
  }
  return { items, collapsed: candidates.length - items.length };
}

export function CandidatePopover({ stopIndex, state, onHover, onChoose, onClose }: Props) {
  const pins = contextPins(state, stopIndex);
  const { items: candidates, collapsed } = dedupeByHex(candidatesFor(stopIndex, pins));
  const current = state.pins[stopIndex as 0 | 3 | 7 | 10];
  // pin이 없을 때 "적용 중"인 색 — 이 stop을 뺀 문맥으로 채운 곡선이 이 자리에
  // 내놓는 값이다. previewScale과 같은 계산(contextPins + fillScale)을 pin
  // 없이 재사용한다. 새 후보로 승격하지 않는다 — 곡선 기본값은 24조합
  // (액센트 6종 × stop 4자리) 중 22에서 이미 후보 hex와 같고, stop 950에는
  // 이미 "기본"이라는 이름의 후보가 있어 승격하면 라디오가 중복되거나
  // dedupeByHex가 하나를 지운다.
  const curveDefaultHex = oklchToHex(fillScale(pins)[stopIndex]);
  const target = current ?? curveDefaultHex;
  // 근사 일치는 "정확히 일치하는 후보가 하나도 없을 때"의 안전망으로만 쓴다 —
  // 항상 근사로 비교하면 stop 0처럼 후보끼리 hex 마지막 자리 하나 차이로
  // 붙어 있는 자리(중립적 #f4f8fe vs 균형 #f3f8ff, 채널 diff 1)에서 TOLERANCE가
  // 그 실제로 다른 두 후보를 같이 "현재"로 잡아버린다(실측: 라디오 2개가
  // 동시에 checked가 되어 같은 name의 네이티브 라디오 그룹이 서로를 밀어내며
  // 클릭이 씹혔다 — 자기 리뷰에서 발견). 정확 일치가 있으면 그걸로 충분하고
  // (24조합 중 22는 항상 여기로 끝난다), 없을 때만(웜톤 stop 950의 왕복 오차
  // 2건) TOLERANCE 안의 후보를 찾는다 — 그 두 경우엔 후보 간 거리가 15 이상
  // 벌어져 있어 안전망이 다른 후보를 잘못 집을 일이 없다.
  const hasExactMatch = candidates.some((cd) => cd.hex === target);
  const isChecked = (hex: string) =>
    hasExactMatch ? hex === target : isCurrent(hex, target);

  return (
    // 카드 크롬(테두리·그림자·여백)은 이제 Popover 패널이 진다. 여기는 목록만
    // 남는다 — 크롬이 둘이면 테두리가 겹쳐 보인다.
    <div onMouseLeave={() => onHover(null)}>
      {candidates.map((cd) => {
        const hex = cd.hex;
        return (
          <label
            key={cd.label}
            data-testid="candidate"
            className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-neutral-50"
            onMouseEnter={() => onHover(hex)}
          >
            <input
              type="radio"
              name={`cand-${stopIndex}`}
              // isChecked: 정확 일치가 있으면 정확 일치만 보고, 없을 때만
              // candidateMatch의 근사 일치로 넘어간다 (위 target 계산 주석 참조).
              checked={isChecked(hex)}
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
      {collapsed > 0 && (
        <p className="mt-1 px-1.5 ds-type-caption-sm text-neutral-500">
          이 앵커에서는 클램프로 후보 폭이 좁아 선택지가 겹칩니다
        </p>
      )}
      <button
        type="button"
        className="mt-1 w-full rounded px-2 py-1 ds-type-caption-sm text-neutral-500 hover:bg-neutral-50"
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
