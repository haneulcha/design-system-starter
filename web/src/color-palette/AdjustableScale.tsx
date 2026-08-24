// web/src/color-palette/AdjustableScale.tsx
//
// 11-stop 띠. 조정 가능한 자리는 누르기 전에 구분되게 표시한다 — "눌러보면 뭔가
// 나온다"는 발견에 기대지 않는다 (스펙 D3). 어포던스는 depth로 준다 — 캡션의
// 굵기·명도 같은 정적 표시는 "누를 수 있다"만 말하고 끝나지만, 그림자는 press에서
// 눌리면서 어포던스와 피드백을 한 언어로 잇는다.

import { useId, useRef, type ReactNode } from "react";
import { STOP_KEYS } from "@core/color/scale.js";
import { Popover } from "../components/Popover";

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
  /** 지금 열려 있는 stop. 후보 패널은 그 칸 안에 뜬다. */
  readonly openIndex?: number | null;
  /** 패널 내용물. 부모가 만든다 — 후보 계산은 여전히 부모 쪽 일이다. */
  readonly popoverContent?: ReactNode;
  readonly onClosePopover?: () => void;
}

export function AdjustableScale({
  hexes, adjustable, pinned, onPick, preview, showCaptions = true,
  openIndex = null, popoverContent, onClosePopover,
}: Props) {
  const shown = preview ?? hexes;
  // clamp 기준이다 — 띠 자신이 경계다(스펙 D3).
  const stripRef = useRef<HTMLDivElement>(null);
  // 열린 칸의 트리거 하나만 들면 된다. 인덱스별 Map을 만들면 ref 객체 정체성이
  // 매 렌더 바뀌어 Popover의 이펙트가 헛돈다.
  const openTriggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  return (
    // 띠 자신이 clamp의 경계다 — 이 밖으로 나가면 옆의 sticky 목업을 덮는다(스펙 D3).
    <div ref={stripRef} className="flex gap-0.5">
      {shown.map((hex, i) => {
        const canAdjust = adjustable.includes(i);
        const label = `${STOP_KEYS[i]} ${hex}${canAdjust ? " — 조정" : ""}`;
        return (
          // relative는 패널의 absolute 기준이다. 열린 칸에만 필요하지만 11칸에
          // 균일하게 주는 편이 조건부보다 읽기 쉽고 해가 없다.
          <div key={STOP_KEYS[i]} className="flex-1 relative">
            {canAdjust && onPick ? (
              <button
                type="button"
                ref={i === openIndex ? openTriggerRef : undefined}
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={i === openIndex}
                aria-controls={i === openIndex ? panelId : undefined}
                data-testid="swatch"
                onClick={() => onPick(i)}
                // 그림자는 Tailwind 기본 shadow-sm/lg가 아니라 커스텀 값이다 —
                // 36px 칩에서 기본 스케일은 배율 1에서 거의 안 보였다(사용자 확인).
                // 광원은 북쪽 고정: 가로 오프셋 0. 대각선을 주면 "종이 조각"처럼
                // 읽히고, 세로만 주면 "눌리는 버튼"으로 읽힌다.
                // 블러는 0 — 블러가 있으면 이 칩 크기에서 대비가 흩어져 신호가 죽는다.
                // press 시 이동 거리(2px)는 기본 깊이(2px)와 같게 맞춘다 — 눌렀을 때
                // 칩이 그림자가 있던 자리에 정확히 내려앉도록. 두 값은 항상 같이
                // 움직여야 한다. hover 리프트를 뺀 이유가 바로 이 대응이다(스펙 D4):
                // 마우스로 누르는 순간은 항상 hover 중이라, hover가 깊이를 4px로
                // 올려놓으면 2px만 내려가 착지가 어긋났다.
                // 그림자 색은 그 상태의 테두리 색과 같다 — 한 칩에 서로 다른
                // 회색이 둘(테두리 하나, 그림자 하나) 있으면 어색해 보인다는
                // 지적이 있었다. pin 여부에 따라 테두리·그림자가 함께
                // neutral-300 ↔ neutral-700으로 움직여 위계도 더 분명해진다.
                className={`block w-full h-9 rounded-sm border cursor-pointer
                  active:shadow-none active:translate-y-[2px]
                  transition-[box-shadow,transform]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-neutral-900 focus-visible:ring-offset-1 ${
                  pinned.includes(i)
                    ? `border-neutral-700
                       shadow-[0_2px_0_0_var(--color-neutral-700)]`
                    : `border-neutral-300
                       shadow-[0_2px_0_0_var(--color-neutral-300)]`
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
                className="mt-1 text-center ds-type-code-sm text-neutral-400"
              >
                {STOP_KEYS[i]}
              </div>
            )}
            {/* 패널은 이 칸 안에 산다 — 형제로 내보내면 absolute의 기준이 사라져
                어느 stop을 조정 중인지가 위치로 안 읽힌다. 라벨에 stop 키를 넣는
                이유도 같다: 스크린리더에는 위치가 없다. */}
            {i === openIndex && popoverContent && (
              <Popover
                open
                onClose={onClosePopover ?? (() => {})}
                label={`${STOP_KEYS[i]} 후보`}
                id={panelId}
                triggerRef={openTriggerRef}
                boundaryRef={stripRef}
              >
                {popoverContent}
              </Popover>
            )}
          </div>
        );
      })}
    </div>
  );
}
