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
                // 그림자는 Tailwind 기본 shadow-sm/lg가 아니라 커스텀 값이다 —
                // 36px 칩에서 기본 스케일은 배율 1에서 거의 안 보였다(사용자 확인).
                // 광원은 북쪽 고정: 가로 오프셋 0. 대각선을 주면 "종이 조각"처럼
                // 읽히고, 세로만 주면 "눌리는 버튼"으로 읽힌다.
                // 블러는 0 — 블러가 있으면 이 칩 크기에서 대비가 흩어져 신호가
                // 죽는다(이번 변경의 핵심). press 시 이동 거리(3px)는 기본
                // 깊이(3px)와 같게 맞춘다 — 눌렀을 때 칩이 그림자가 있던 자리에
                // 정확히 내려앉도록, 물리적 대응이 깨지지 않게.
                // 그림자 색은 그 상태의 테두리 색과 같다 — 한 칩에 서로 다른
                // 회색이 둘(테두리 하나, 그림자 하나) 있으면 어색해 보인다는
                // 지적이 있었다. pin 여부에 따라 테두리·그림자가 함께
                // neutral-300 ↔ neutral-700으로 움직여 위계도 더 분명해진다.
                className={`block w-full h-9 rounded-sm border cursor-pointer
                  active:shadow-none active:translate-y-[3px]
                  transition-[box-shadow,transform]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-neutral-900 focus-visible:ring-offset-1 ${
                  pinned.includes(i)
                    ? `border-neutral-700
                       shadow-[0_3px_0_0_var(--color-neutral-700)]
                       hover:shadow-[0_5px_0_0_var(--color-neutral-700)]`
                    : `border-neutral-300
                       shadow-[0_3px_0_0_var(--color-neutral-300)]
                       hover:shadow-[0_5px_0_0_var(--color-neutral-300)]`
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
