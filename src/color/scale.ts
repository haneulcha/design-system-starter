// src/color/scale.ts
//
// 팔레트 스케일 엔진. 고정점(Pin) N개 사이를 OURS_CURVE 모양으로 채운다.
// 앵커 pin 하나만으로도 완전한 11-stop이 나온다 — 5단계 선택은 학습 순서이지
// 엔진의 제약이 아니다 (그 순서는 src/lab/palette/guided.ts에 있다).

import { converter } from "culori"; // toRgb가 쓴다 — 빠뜨리기 쉽다
import { OURS_CURVE } from "./curve.js";
import type { Oklch } from "../schema/types.js";

export interface Pin {
  /** 0..10 = stop 50..950 */
  index: number;
  color: Oklch;
}

export const SCALE_SIZE = 11;

export const STOP_KEYS = [
  "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950",
] as const;

const toRgb = converter("rgb");

function displayable({ l, c, h }: Oklch): boolean {
  const rgb = toRgb({ mode: "oklch", l, c, h });
  if (!rgb) return false;
  const eps = 1e-4;
  const ok = (v: number | undefined) =>
    typeof v === "number" && v >= -eps && v <= 1 + eps;
  return ok(rgb.r) && ok(rgb.g) && ok(rgb.b);
}

/** sRGB 밖이면 그 밝기·hue에서 표현 가능한 최대 채도로 잘라 반환 (이진 탐색 20회).
 *  web/src/lib/oklch.ts clampChromaToGamut와 같은 수학 — 엔진은 web을 import할
 *  수 없어(방향 역전) src 쪽에 별도로 둔다. */
export function clampToGamut(color: Oklch): Oklch {
  if (displayable(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (displayable({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

/** 원형 최단거리 hue 보간 */
function hueLerp(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

/** 고정점 사이를 OURS_CURVE 모양으로 채운 11-stop 스케일.
 *  - 앵커 pin(index 5) 필수. pin 색은 in-gamut 가정 (UI가 보장) → verbatim 보존.
 *  - 실제 pin이 없는 양 끝은 곡선 끝 L + 최근접 pin에 비례한 채도의 가상 고정점.
 *  - 보간 stop과 가상 끝점은 gamut 클램프 후 반환.
 *  - v0 동치: pins=[{index: 5, color: anchor}] 일 때, 앵커 L ∈ [0.32, 0.93]이면
 *    oursAlgorithm.derive(hex, nativeSpec) + clampToGamut[]와 동일. 범위 밖에서는
 *    fillScale이 true anchor L을 사용해 단조성 보존 (v0의 clamp는 문서화된 한계). */
export function fillScale(
  pins: readonly Pin[],
  /** stop별 Δh (11개). 클램프 직전에 적용된다 — 시맨틱 스케일용. */
  hueRamp?: readonly number[],
): Oklch[] {
  if (!pins.some((p) => p.index === 5)) {
    throw new Error("fillScale: anchor pin (index 5) is required");
  }
  const ramped = (c: Oklch, i: number): Oklch =>
    hueRamp ? { ...c, h: (((c.h + hueRamp[i]) % 360) + 360) % 360 } : c;
  const sorted = [...pins].sort((a, b) => a.index - b.index);
  const eff: { index: number; color: Oklch; virtual: boolean }[] = sorted.map(
    (p) => ({ ...p, virtual: false }),
  );
  // eps-guard: anchor.l이 곡선 범위 [0.2777, 0.9772] 밖이면 같은 쪽 stop들이
  // anchor.l에 붕괴 (headroom 없음 — v1 spec에서 근-white/근-black 앵커 범위 밖).
  const eps = 1e-7;
  const first = sorted[0];
  if (first.index !== 0) {
    // 가상 끝점 L(밝은 쪽): OURS_CURVE[0] 또는 (anchor.l + eps) 중 더 밝은 쪽 사용.
    // anchor.l > 0.9772이면 eps-guard 발동: candidate = anchor.l + eps,
    // 그러면 stop 0..4가 anchor 근처로 붕괴 (선택지 부족).
    const candidate = Math.max(OURS_CURVE[0].l, first.color.l + eps);
    eff.unshift({
      index: 0,
      virtual: true,
      color: {
        l: candidate,
        c: first.color.c * (OURS_CURVE[0].cMult / OURS_CURVE[first.index].cMult),
        h: first.color.h,
      },
    });
  }
  const last = sorted[sorted.length - 1];
  if (last.index !== SCALE_SIZE - 1) {
    // 가상 끝점 L(어두운 쪽): OURS_CURVE[10] 또는 (anchor.l - eps) 중 더 어두운 쪽 사용.
    // anchor.l < 0.2777이면 eps-guard 발동: candidate = anchor.l - eps,
    // 그러면 stop 6..10이 anchor 근처로 붕괴 (선택지 부족).
    const candidate = Math.min(OURS_CURVE[SCALE_SIZE - 1].l, last.color.l - eps);
    eff.push({
      index: SCALE_SIZE - 1,
      virtual: true,
      color: {
        l: candidate,
        c: last.color.c * (OURS_CURVE[SCALE_SIZE - 1].cMult / OURS_CURVE[last.index].cMult),
        h: last.color.h,
      },
    });
  }

  const out: Oklch[] = new Array(SCALE_SIZE);
  for (const p of eff) {
    out[p.index] = p.virtual ? clampToGamut(ramped(p.color, p.index)) : { ...p.color };
  }
  for (let s = 0; s < eff.length - 1; s++) {
    const a = eff[s];
    const b = eff[s + 1];
    const li = OURS_CURVE[a.index].l;
    const lj = OURS_CURVE[b.index].l;
    const ra = a.color.c / OURS_CURVE[a.index].cMult;
    const rb = b.color.c / OURS_CURVE[b.index].cMult;
    for (let k = a.index + 1; k < b.index; k++) {
      const t = (li - OURS_CURVE[k].l) / (li - lj);
      out[k] = clampToGamut(
        ramped(
          {
            l: a.color.l - t * (a.color.l - b.color.l),
            c: OURS_CURVE[k].cMult * (ra + (rb - ra) * t),
            h: hueLerp(a.color.h, b.color.h, t),
          },
          k,
        ),
      );
    }
  }
  return out;
}
