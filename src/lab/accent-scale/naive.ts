// src/lab/accent-scale/naive.ts
//
// 나이브 컨트롤: OKLCH에서 흰 근방 → 앵커 → 검정 근방을 L/C 선형 보간.
// "알고리즘 없음"의 하한 기준점. 앵커는 anchorIndex에 정확히 놓인다.

import { parsePrimary } from "../../generator/color.js";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

const LIGHT_END = { l: 0.98, c: 0.005 };
const DARK_END = { l: 0.1, c: 0.005 };

export const naiveAlgorithm: AccentAlgorithm = {
  id: "naive",
  label: "나이브 보간 (컨트롤)",
  nativeSpec: { count: 11, anchorIndex: 5 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const anchor = parsePrimary(anchorHex);
    return Array.from({ length: spec.count }, (_, i) => {
      if (i === spec.anchorIndex) return { ...anchor };
      if (i < spec.anchorIndex) {
        const t = i / spec.anchorIndex; // 0=밝은 끝, 1=앵커
        return {
          l: LIGHT_END.l + (anchor.l - LIGHT_END.l) * t,
          c: LIGHT_END.c + (anchor.c - LIGHT_END.c) * t,
          h: anchor.h,
        };
      }
      const t = (i - spec.anchorIndex) / (spec.count - 1 - spec.anchorIndex);
      return {
        l: anchor.l + (DARK_END.l - anchor.l) * t,
        c: anchor.c + (DARK_END.c - anchor.c) * t,
        h: anchor.h,
      };
    });
  },
};
