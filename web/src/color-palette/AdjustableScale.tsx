// web/src/color-palette/AdjustableScale.tsx
//
// 11-stop 띠. 조정 가능한 자리는 누르기 전에 구분되게 표시한다 — "눌러보면 뭔가
// 나온다"는 발견에 기대지 않는다 (스펙 D3).

import { STOP_KEYS } from "@core/color/scale.js";

interface Props {
  readonly hexes: readonly string[];
  readonly adjustable: readonly number[];
  readonly pinned: readonly number[];
  readonly onPick?: (stopIndex: number) => void;
  /** 후보 hover 중이면 그 스케일을 대신 그린다. 확정 아님. */
  readonly preview?: readonly string[] | null;
}

export function AdjustableScale({ hexes, adjustable, pinned, onPick, preview }: Props) {
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
                className={`block w-full h-9 rounded-sm border ${
                  pinned.includes(i) ? "border-neutral-900" : "border-neutral-300"
                } hover:ring-2 hover:ring-neutral-900 hover:ring-offset-1`}
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
            <div className="mt-1 text-center text-[9px] font-mono text-neutral-400">
              {STOP_KEYS[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
