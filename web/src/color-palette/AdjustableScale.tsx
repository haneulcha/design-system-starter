// web/src/color-palette/AdjustableScale.tsx
//
// 11-stop 띠. 조정 가능한 자리는 누르기 전에 구분되게 표시한다 — "눌러보면 뭔가
// 나온다"는 발견에 기대지 않는다 (스펙 D3). 어포던스는 depth로 준다 — 캡션의
// 굵기·명도 같은 정적 표시는 "누를 수 있다"만 말하고 끝나지만, 그림자는
// hover에서 뜨고 press에서 눌리면서 상호작용 전체를 한 언어로 잇는다.

import { STOP_KEYS } from "@core/color/scale.js";

interface Props {
  readonly hexes: readonly string[];
  readonly adjustable: readonly number[];
  readonly pinned: readonly number[];
  readonly onPick?: (stopIndex: number) => void;
  /** 후보 hover 중이면 그 스케일을 대신 그린다. 확정 아님. */
  readonly preview?: readonly string[] | null;
  /** 캡션(stop 번호) 줄을 그릴지. 기본 true — 상태색처럼 4벌이 접힌 채 쌓이는
   *  자리에서 세로를 아끼는 용도로만 끈다. */
  readonly showCaptions?: boolean;
}

export function AdjustableScale({
  hexes, adjustable, pinned, onPick, preview, showCaptions = true,
}: Props) {
  const shown = preview ?? hexes;
  return (
    <div className="flex gap-0.5">
      {shown.map((hex, i) => {
        const canAdjust = adjustable.includes(i);
        const label = `${STOP_KEYS[i]} ${hex}${canAdjust ? " — 조정" : ""}`;
        return (
          <div key={STOP_KEYS[i]} className="flex-1">
            {canAdjust && onPick ? (
              <button
                type="button"
                aria-label={label}
                data-testid="swatch"
                onClick={() => onPick(i)}
                className={`block w-full h-9 rounded-sm border cursor-pointer
                  shadow-sm hover:shadow-lg active:shadow-none active:translate-y-px
                  transition-[box-shadow,transform]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-neutral-900 focus-visible:ring-offset-1 ${
                  pinned.includes(i) ? "border-neutral-900" : "border-neutral-300"
                }`}
                style={{ background: hex }}
              />
            ) : (
              <div
                aria-label={label}
                data-testid="swatch"
                className="w-full h-9 rounded-sm border border-neutral-200"
                style={{ background: hex }}
              />
            )}
            {/* 조정 가능 여부는 칩(1px 테두리 차이)도 캡션의 굵기·명도도 아니라
                스와치 자체의 depth(그림자)로 드러낸다 — 신호가 둘이면 캡션이
                소음이 된다. 캡션은 stop 번호만 남긴다(스펙 D3, D9). */}
            {showCaptions && (
              <div
                data-testid="stop-caption"
                className="mt-1 text-center text-[9px] font-mono text-neutral-400"
              >
                {STOP_KEYS[i]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
