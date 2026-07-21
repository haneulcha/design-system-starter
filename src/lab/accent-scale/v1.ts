// src/lab/accent-scale/v1.ts
//
// v1 현행 유도의 어댑터. 곡선 테이블은 src/generator/color.ts CHROMATIC_STEPS
// 의 복제본 — 연구 격리를 위해 제품 파일을 export 변경 없이 그대로 둔다.
// v1 특성: 입력 색의 C/H만 쓰고 L은 고정 사다리 (입력 L 무시).

import { parsePrimary } from "../../generator/color.js";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

// src/generator/color.ts:32-43 복제 (2026-07-21 기준)
const V1_CURVE: readonly { l: number; cMult: number }[] = [
  { l: 0.96, cMult: 0.3 },
  { l: 0.91, cMult: 0.45 },
  { l: 0.84, cMult: 0.6 },
  { l: 0.74, cMult: 0.75 },
  { l: 0.64, cMult: 0.9 },
  { l: 0.55, cMult: 0.97 },
  { l: 0.45, cMult: 1.0 },
  { l: 0.35, cMult: 0.95 },
  { l: 0.23, cMult: 0.65 },
  { l: 0.14, cMult: 0.5 },
];

/** 0..1 위치 p에서 V1_CURVE를 구간 선형 보간 */
function sampleCurve(p: number): { l: number; cMult: number } {
  const x = p * (V1_CURVE.length - 1);
  const i = Math.min(Math.floor(x), V1_CURVE.length - 2);
  const t = x - i;
  const a = V1_CURVE[i];
  const b = V1_CURVE[i + 1];
  return { l: a.l + (b.l - a.l) * t, cMult: a.cMult + (b.cMult - a.cMult) * t };
}

export const v1Algorithm: AccentAlgorithm = {
  id: "v1",
  label: "v1 현행 (고정 L 사다리)",
  description:
    "고정된 밝기 사다리(0.96→0.14)에 입력색의 채도·색상만 얹는다. 입력색의 밝기는 무시 — 내 브랜드 컬러가 스케일 안에 그대로 존재하지 않을 수 있다.",
  nativeSpec: { count: 10, anchorIndex: 6 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const anchor = parsePrimary(anchorHex);
    return Array.from({ length: spec.count }, (_, i) => {
      const { l, cMult } = sampleCurve(i / (spec.count - 1));
      return { l, c: anchor.c * cMult, h: anchor.h };
    });
  },
};
